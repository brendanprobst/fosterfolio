"use client";

import { ShareQrDownload } from "@client/components/ShareQrDownload";
import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { userProfileHref } from "@client/lib/userProfilePath";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type ProfileLinkCardProps = {
  handleOrId: string;
  hasHandle: boolean;
};

export function ProfileLinkCard({ handleOrId, hasHandle }: ProfileLinkCardProps) {
  const path = userProfileHref(handleOrId);
  const [copied, setCopied] = useState(false);

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
    <Card size="sm">
      <CardHeader>
        <CardTitle>Share your profile</CardTitle>
        <CardDescription>
          {hasHandle
            ? "Print or copy the public URL. People land on your profile."
            : "Public links use your id until you pick a handle."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
        {!hasHandle ? (
          <p className="text-muted-foreground text-xs">
            Add a handle in Edit name and bio so this becomes /@your-name.
          </p>
        ) : null}
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
        <ShareQrDownload
          href={path}
          heading="Profile QR"
          description="Scanning this opens your public profile."
          downloadName={handleOrId}
          imageAlt="QR code for your public profile"
        />
      </CardContent>
    </Card>
  );
}
