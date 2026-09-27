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
            Download a PNG for now. Size, color, and other print settings will land
            here later.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ShareQrDownload
            href={href}
            downloadName={downloadName}
            imageAlt={imageAlt}
            showHeader={false}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
