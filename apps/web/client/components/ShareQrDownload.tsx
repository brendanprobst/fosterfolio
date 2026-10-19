"use client";

import { QrDownloadMenu } from "@client/components/qr";
import { cn } from "@client/lib/utils";
import { useEffect, useMemo, useState } from "react";

type ShareQrDownloadProps = {
  href: string;
  downloadName: string;
  imageAlt: string;
  heading?: string;
  description?: string;
  /** When false, only the preview and download control render (for a host dialog). */
  showHeader?: boolean;
  /** Center the preview and download control. Used by the share dialog. */
  centered?: boolean;
};

export function ShareQrDownload({
  href,
  downloadName,
  imageAlt,
  heading = "QR code",
  description,
  showHeader = true,
  centered = false,
}: ShareQrDownloadProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const absoluteUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${href}`;
  }, [href]);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default;
        const next = await QRCode.toDataURL(absoluteUrl, {
          width: 320,
          margin: 2,
          color: { dark: "#111111", light: "#ffffff" },
        });
        if (!cancelled) {
          setDataUrl(next);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not generate a QR code.");
      }
    }
    void generate();
    return () => {
      cancelled = true;
    };
  }, [absoluteUrl]);

  return (
    <section className="space-y-3" aria-label="Share QR code">
      {showHeader ? (
        <>
          <h2 className="text-lg font-medium">{heading}</h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {dataUrl ? (
        <div className={cn("space-y-3", centered && "flex flex-col items-center")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={imageAlt}
            className="border-border bg-background size-40 rounded-md border p-2"
          />
          <QrDownloadMenu url={absoluteUrl} filenameBase={downloadName} />
        </div>
      ) : !error ? (
        <p className="text-muted-foreground text-sm">Generating QR…</p>
      ) : null}
    </section>
  );
}
