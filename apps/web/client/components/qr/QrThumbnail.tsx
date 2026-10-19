"use client";

import { cn } from "@client/lib/utils";
import { useEffect, useState } from "react";

type QrThumbnailProps = {
  /** Absolute URL encoded in the QR. */
  url: string;
  alt: string;
  className?: string;
};

/** Small on-screen QR preview. Downloads go through `QrDownloadMenu`. */
export function QrThumbnail({ url, alt, className }: QrThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then(async (qr) => {
      const dataUrl = await qr.default.toDataURL(url, { width: 128, margin: 1 });
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!src) return <div className={cn("bg-muted size-16 rounded-md", className)} aria-hidden />;
  return <img src={src} alt={alt} className={cn("size-16 rounded-md", className)} />;
}
