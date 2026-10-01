"use client";

import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { ShareQrDialog } from "@client/components/ShareQrDialog";
import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Check, Copy, QrCode } from "lucide-react";
import { useState } from "react";

export type ShareLinkCardProps = {
  title: string;
  description: string;
  path: string;
  downloadName: string;
  imageAlt: string;
  qrTitle: string;
};

export function ShareLinkCard({
  title,
  description,
  path,
  downloadName,
  imageAlt,
  qrTitle,
}: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function copyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-1">
          <OwnerOnlyLabel />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => void copyLink()}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          aria-label="QR code"
          onClick={() => setQrOpen(true)}
        >
          <QrCode aria-hidden />
          QR code
        </Button>
        <ShareQrDialog
          open={qrOpen}
          onOpenChange={setQrOpen}
          title={qrTitle}
          href={path}
          downloadName={downloadName}
          imageAlt={imageAlt}
        />
      </CardContent>
    </Card>
  );
}
