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
import { ExpandableInquiryForm } from "@client/features/inquiries";
import { cn } from "@client/lib/utils";
import { fosterMeHref } from "@client/lib/userProfilePath";
import { Check, Copy, PawPrint, Pencil, QrCode } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FosteredBy } from "./FosteredBy";

type PetBioSidebarProps = {
  petName: string;
  petId: string;
  petPath: string;
  ownerId: string;
  ownerRef: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  isActivelyFostering: boolean;
  isOwner: boolean;
};

export function PetBioSidebar({
  petName,
  petId,
  petPath,
  ownerId,
  ownerRef,
  ownerName,
  ownerAvatarUrl,
  isActivelyFostering,
  isOwner,
}: PetBioSidebarProps) {
  return (
    <>
      {isOwner ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Edit {petName}&apos;s bio</CardTitle>
            <CardDescription>
              Change what visitors and adopters see on this public page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/profile"
              className={cn(buttonVariants({ size: "sm" }), "w-full")}
            >
              <Pencil aria-hidden />
              Edit bio
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Interested in {petName}?</CardTitle>
            <CardDescription>
              Ask {ownerName || "the foster"} about this pet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FosteredBy
              name={ownerName || "Foster profile"}
              avatarUrl={ownerAvatarUrl}
              ownerRef={ownerRef}
            />
            {isActivelyFostering ? (
              <p className="text-muted-foreground text-sm">
                Actively fostering {petName}
              </p>
            ) : (
              <div className="space-y-2">
                <p
                  className="border-border bg-muted/40 rounded-lg border px-3 py-2 text-sm"
                  role="status"
                >
                  This pet isn’t actively fostered by {ownerName || "this foster"}.
                </p>
                <Link
                  href={fosterMeHref(ownerRef)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full",
                  )}
                >
                  <PawPrint aria-hidden />
                  See who they’re fostering now
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {isOwner ? null : (
        <ExpandableInquiryForm
          targetUserId={ownerId}
          targetPetId={petId}
          heading="Contact the foster"
        />
      )}
      {isOwner ? <SharePetCard petName={petName} path={petPath} /> : null}
    </>
  );
}

function SharePetCard({ petName, path }: { petName: string; path: string }) {
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
        <CardTitle>Share this bio</CardTitle>
        <CardDescription>
          A flyer QR stays on {petName} — unlike a foster-me link, it will not
          follow the next pet.
        </CardDescription>
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
          title={`${petName} QR`}
          href={path}
          downloadName={petName}
          imageAlt={`QR code for ${petName}`}
        />
      </CardContent>
    </Card>
  );
}
