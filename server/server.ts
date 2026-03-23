import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

const corsOption = {
  origin: process.env.TRUSTED_ORIGINS?.split(",") || [],
  credentials: true,
};

// Middleware
app.use(cors(corsOption));
app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
