"use client";

import { Button } from "@client/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type ShareQrDownloadProps = {
  href: string;
  description: string;
  downloadName: string;
  imageAlt: string;
  heading?: string;
};

export function ShareQrDownload({
  href,
  description,
  downloadName,
  imageAlt,
  heading = "QR code",
}: ShareQrDownloadProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default;
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}${href}`;
        const next = await QRCode.toDataURL(url, {
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
  }, [href]);

  function downloadPng() {
    if (!dataUrl) return;
    const safeName = downloadName.trim().replace(/[^\w.-]+/g, "-") || "share";
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${safeName}-fosterfolio-qr.png`;
    link.click();
  }

  return (
    <section className="space-y-3" aria-label="Share QR code">
      <h2 className="text-lg font-medium">{heading}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {dataUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={imageAlt}
            className="border-border bg-background size-40 rounded-md border p-2"
          />
          <Button type="button" variant="outline" size="sm" onClick={downloadPng}>
            <Download />
            Download PNG
          </Button>
        </div>
      ) : !error ? (
        <p className="text-muted-foreground text-sm">Generating QR…</p>
      ) : null}
    </section>
  );
}
