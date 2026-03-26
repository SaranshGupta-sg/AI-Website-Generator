import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";

export const stripeWebhook = async (req: Request, res: Response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = req.headers["stripe-signature"] as string;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret,
      );
    } catch (err: any) {
      console.log("⚠️ Webhook signature verification failed.", err.message);
      return res.sendStatus(400);
    }
  } else {
    return res.status(500).json({ message: "Webhook secret not configured" });
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const sessionList = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
      });
      const session = sessionList.data[0];
      const { transactionId, appId } = session.metadata as {
        transactionId: string;
        appId: string;
      };

      if (appId === "site-builder" && transactionId) {
        const transaction = await prisma.transaction.update({
          where: { id: transactionId },
          data: { isPaid: true },
        });

        //   Add the credits to the user data
        await prisma.user.update({
          where: { id: transaction.userId },
          data: { credits: { increment: transaction.credits } },
        });
      }
      console.log("PaymentIntent was successful!", paymentIntent.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
};
