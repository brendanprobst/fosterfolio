"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";

type ShareQrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  href: string;
  downloadName: string;
  imageAlt: string;
};

export function ShareQrDialog({
  open,
  onOpenChange,
  title,
  href,
  downloadName,
  imageAlt,
}: ShareQrDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a size for the web, an A4 flyer, or a large print.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ShareQrDownload
            href={href}
            downloadName={downloadName}
            imageAlt={imageAlt}
            showHeader={false}
            centered
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
