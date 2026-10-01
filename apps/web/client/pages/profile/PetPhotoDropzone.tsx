"use client";

import { Button } from "@client/components/ui/button";
import { isAllowedImageFile } from "@client/lib/media/isAllowedImageFile";
import { cn } from "@client/lib/utils";
import { ClipboardPaste, ImagePlus, X } from "lucide-react";
import { DragEvent, useId, useRef, useState } from "react";

type PetPhotoDropzoneProps = {
  photoUrl: string;
  pending: boolean;
  onFile: (file: File) => void | Promise<void>;
  onRemove: () => void;
};

async function imageFileFromClipboard(): Promise<File | null> {
  if (!navigator.clipboard?.read) {
    throw new Error("This browser cannot read the clipboard.");
  }
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((candidate) => candidate.startsWith("image/"));
    if (!type) continue;
    const blob = await item.getType(type);
    const file =
      blob instanceof File
        ? blob
        : new File([blob], `clipboard.${type.split("/")[1] ?? "png"}`, { type });
    return file;
  }
  return null;
}

export function PetPhotoDropzone({
  photoUrl,
  pending,
  onFile,
  onRemove,
}: PetPhotoDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      setLocalError("Only JPEG, PNG, WebP, and GIF images are supported.");
      return;
    }
    await onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void accept(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Primary photo</p>
      <div
        role="group"
        aria-label="Photo drop area"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border-border bg-muted/30 flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
        )}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Current pet photo"
            className="border-border max-h-40 rounded-md border object-cover"
          />
        ) : (
          <ImagePlus className="text-muted-foreground size-8" aria-hidden />
        )}
        <p className="text-muted-foreground max-w-sm text-sm">
          {pending
            ? "Uploading…"
            : "Drop a photo here, or click browse. You can also paste from the clipboard."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              void (async () => {
                try {
                  const file = await imageFileFromClipboard();
                  if (!file) {
                    setLocalError("No image on the clipboard.");
                    return;
                  }
                  await accept(file);
                } catch (error) {
                  setLocalError(
                    error instanceof Error
                      ? error.message
                      : "Could not read the clipboard.",
                  );
                }
              })();
            }}
          >
            <ClipboardPaste aria-hidden />
            Upload from clipboard
          </Button>
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setLocalError(null);
                onRemove();
              }}
            >
              <X aria-hidden />
              Remove photo
            </Button>
          ) : null}
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            void accept(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {localError ? <p className="text-destructive text-sm">{localError}</p> : null}
    </div>
  );
}
