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
import { Separator } from "@client/components/ui/separator";
import { fosterMeHref, userProfileHref } from "@client/lib/userProfilePath";
import { Check, Copy, QrCode } from "lucide-react";
import { useState } from "react";

type ProfileLinkCardProps = {
  handleOrId: string;
  hasHandle: boolean;
};

type ShareRowProps = {
  title: string;
  description: string;
  path: string;
  qrTitle: string;
  downloadName: string;
  imageAlt: string;
};

function ShareRow({
  title,
  description,
  path,
  qrTitle,
  downloadName,
  imageAlt,
}: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function copyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          aria-label={`Copy ${title} link`}
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
          aria-label={`${title} QR code`}
          onClick={() => setQrOpen(true)}
        >
          <QrCode aria-hidden />
          QR code
        </Button>
      </div>
      <ShareQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        title={qrTitle}
        href={path}
        downloadName={downloadName}
        imageAlt={imageAlt}
      />
    </div>
  );
}

export function ProfileLinkCard({ handleOrId, hasHandle }: ProfileLinkCardProps) {
  const profilePath = userProfileHref(handleOrId);
  const fosterMePath = fosterMeHref(handleOrId);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Sharing your profile</CardTitle>
        <CardDescription>
          {hasHandle
            ? "Print or copy the URL that matches what the flyer should do."
            : "Public links use your id until you pick a handle."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasHandle ? (
          <p className="text-muted-foreground text-xs">
            Add a handle in Edit name and bio so these become /@your-name.
          </p>
        ) : null}
        <ShareRow
          title="Profile Link"
          description="Opens your public profile — who you are, your pets, and how to reach you."
          path={profilePath}
          qrTitle="Profile QR"
          downloadName={handleOrId}
          imageAlt="QR code for your public profile"
        />
        <Separator />
        <ShareRow
          title={`\"Foster Me\" Link`}
          description="Always opens whoever you’re fostering now — not one specific pet. Find a pet-specific share link on the pet bio page."
          path={fosterMePath}
          qrTitle="Foster-me QR"
          downloadName={`${handleOrId}-foster-me`}
          imageAlt="QR code for your current-foster page"
        />
      </CardContent>
    </Card>
  );
}
