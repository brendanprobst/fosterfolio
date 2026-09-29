"use client";

import { ShareQrDialog } from "@client/components/ShareQrDialog";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { cn } from "@client/lib/utils";
import { fosterMeHref, userProfileHref } from "@client/lib/userProfilePath";
import { Check, Copy, Eye, PawPrint, QrCode, User } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType } from "react";

type ProfileLinkCardProps = {
  handleOrId: string;
  hasHandle: boolean;
};

type ShareTone = "profile" | "fosterMe";

type ShareRowProps = {
  title: string;
  description: string;
  path: string;
  qrTitle: string;
  downloadName: string;
  imageAlt: string;
  tone: ShareTone;
};

const toneStyles: Record<
  ShareTone,
  {
    Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    panel: string;
    banner: string;
  }
> = {
  profile: {
    Icon: User,
    panel: "bg-muted/40 ring-foreground/10",
    banner: "text-foreground -mx-3 -mt-3 mb-3 rounded-t-xl px-3 py-2",
  },
  fosterMe: {
    Icon: PawPrint,
    panel: "bg-card ring-primary/25",
    banner: "bg-primary text-primary-foreground -mx-3 -mt-3 mb-3 rounded-t-xl px-3 py-2",
  },
};

function ShareRow({
  title,
  description,
  path,
  qrTitle,
  downloadName,
  imageAlt,
  tone,
}: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { Icon, panel, banner } = toneStyles[tone];

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
    <section
      aria-label={title}
      className={cn("space-y-3 rounded-xl p-3 ring-1", panel)}
    >
      <div className={cn("flex items-center gap-2", banner)}>
        <Icon aria-hidden className="size-4 shrink-0" />
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
      <div className="space-y-2">
        <Link
          href={path}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          aria-label={`Preview ${title}`}
        >
          <Eye aria-hidden />
          Preview
        </Link>
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
    </section>
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
          This editor is private. Preview, copy, or print the public URL that
          matches what the flyer should do.
          {!hasHandle
            ? " Public links use your id until you pick a handle."
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
          tone="profile"
        />
        <ShareRow
          title={`\"Foster Me\" Link`}
          description="Always opens whoever you’re fostering now — not one specific pet. Find a pet-specific share link on the pet bio page."
          path={fosterMePath}
          qrTitle="Foster-me QR"
          downloadName={`${handleOrId}-foster-me`}
          imageAlt="QR code for your current-foster page"
          tone="fosterMe"
        />
      </CardContent>
    </Card>
  );
}
