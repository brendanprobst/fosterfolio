"use client";

import { Button } from "@client/components/ui/button";
import { petBioHref } from "@client/lib/petBioPath";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type PetQrDownloadProps = {
  petId: string;
  petName: string;
};

export function PetQrDownload({ petId, petName }: PetQrDownloadProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default;
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}${petBioHref(petId)}`;
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
  }, [petId]);

  function downloadPng() {
    if (!dataUrl) return;
    const safeName = petName.trim().replace(/[^\w.-]+/g, "-") || "pet";
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${safeName}-fosterfolio-qr.png`;
    link.click();
  }

  return (
    <section className="space-y-3" aria-label="Share QR code">
      <h2 className="text-lg font-medium">QR code</h2>
      <p className="text-muted-foreground text-sm">
        Print this on a tag or flyer. Scanning it opens this bio page.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {dataUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={`QR code for ${petName}`}
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
