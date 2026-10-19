"use client";

import { Dialog, DialogContent, DialogTitle } from "@client/components/ui/dialog";
import { cn } from "@client/lib/utils";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

type PhotoOpenerProps = {
  src: string;
  /** Describes the photo; also names the thumbnail button and the dialog. */
  label: string;
  /** Thumbnail sizing; defaults to a fixed-height, full-width crop. */
  className?: string;
};

/**
 * Fixed-height, cropped thumbnail that opens the full photo in a dialog.
 * Hover / focus zoom the crop slightly and reveal a "View photo" chip.
 */
export function PhotoOpener({ src, label, className }: PhotoOpenerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={cn(
          "group border-border focus-visible:ring-ring/50 relative block h-48 w-full cursor-zoom-in overflow-hidden rounded-md border focus-visible:ring-3 focus-visible:outline-none",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105 group-focus-visible:scale-105"
        />
        <span
          aria-hidden
          className="bg-background/85 text-foreground absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-80 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Maximize2 className="size-3" /> View photo
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Wider than the default max-w-2xl on purpose: a photo viewer, not a form. */}
        <DialogContent className="max-w-4xl gap-0 p-3 pt-11">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {open ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={label} className="mx-auto max-h-[78vh] w-auto rounded-md object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
