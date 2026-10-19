"use client";

import { ShareQrDialog } from "@client/components/ShareQrDialog";
import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { CopyLinkButton } from "./CopyLinkButton";

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
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
        <CopyLinkButton path={path} size="sm" className="w-full" />
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
