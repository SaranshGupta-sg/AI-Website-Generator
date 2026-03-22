import { forwardRef, useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { iframeScript } from "../assets/assets";
import EditorPanel from "./EditorPanel";

type ElementStyles = {
  padding: string;
  margin: string; 
  backgroundColor: string;
  color: string;
  fontSize: string;
};

export type SelectedElement = {
  tagName: string;
  className: string;
  text: string;
  styles: ElementStyles;
};

export type ElementUpdates = Partial<{
  tagName: string;
  className: string;
  text: string;
  styles: Partial<ElementStyles>;
}>;

interface ProjectPreviewProps {
  project: Project;
  isGenerating: boolean;
  device?: "phone" | "tablet" | "desktop";
  showEditorPanel?: boolean;
}

export interface ProjectPreviewRef {
  getCode: () => string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
  (
    { project, isGenerating, device = "desktop", showEditorPanel = true },
    ref,
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selectedElement, setSelectedElement] =
      useState<SelectedElement | null>(null);

    const resolutions = {
      phone: "w-[412px]",
      tablet: "w-[768px]",
      desktop: "w-full",
    };

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        console.log("MESSAGE RECEIVED:", event.data); // 👈 ADD THIS
        if (event.data.type === "ELEMENT_SELECTED") {
          setSelectedElement(event.data.payload);
        } else if (event.data.type === "CLEAR_SELECTION") {
          setSelectedElement(null);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleUpdate = (updates: ElementUpdates) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "UPDATE_ELEMENT",
            payload: updates,
          },
          "*",
        );
      }
    };

    const injectPreview = (html: string) => {
  if (!html) return "";
  if (!showEditorPanel) return html;

  // 🔥 ALWAYS append script (no condition)
  return html + iframeScript;
};
    return (
      <div className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2">
        {project.current_code ? (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={injectPreview(project.current_code)}
              className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
            />
            {showEditorPanel && selectedElement && (
              <EditorPanel
                selectedElement={selectedElement}
                onUpdate={handleUpdate}
                onClose={() => {
                  setSelectedElement(null);
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      { type: "CLEAR_SELECTION_REQUEST" },
                      "*",
                    );
                  }
                }}
              />
            )}
          </>
        ) : (
          isGenerating && <div>loading</div>
        )}
      </div>
    );
  },
);

export default ProjectPreview;
