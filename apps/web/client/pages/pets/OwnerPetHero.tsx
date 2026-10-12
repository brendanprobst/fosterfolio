"use client";

import { PetFacts } from "@client/components/PetFacts";
import { QrDownloadMenu } from "@client/components/qr";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import type { PetPublic } from "@client/features/pets";
import { PostComposer } from "@client/features/posts";
import { absoluteUrl } from "@client/lib/absoluteUrl";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { Megaphone, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CopyLinkButton } from "./CopyLinkButton";
import { OwnerAnalyticsWidget } from "./OwnerAnalyticsWidget";
import { PetInquiries } from "./PetInquiries";

/**
 * Each owner action gets its own color in one shared style: tinted fill, colored
 * border, dark text (light-on-dark in dark mode). All sit on the outline variant.
 */
const actionColors = {
  postUpdate:
    "border-rose-600 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:text-rose-900 dark:border-rose-400 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900 dark:hover:text-rose-100",
  editBio:
    "border-violet-600 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:text-violet-900 dark:border-violet-400 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900 dark:hover:text-violet-100",
  copyLink:
    "border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:text-teal-900 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-200 dark:hover:bg-teal-900 dark:hover:text-teal-100",
  qrCode:
    "border-amber-600 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 aria-expanded:bg-amber-100 aria-expanded:text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900 dark:hover:text-amber-100 dark:aria-expanded:bg-amber-900 dark:aria-expanded:text-amber-100",
};

export function OwnerPetHero({
  pet,
  ownerRef,
  petPath,
}: {
  pet: PetPublic;
  ownerRef: string;
  petPath: string;
}) {
  const [composing, setComposing] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);

  function onComposingChange(open: boolean) {
    if (!open && draftDirty && !window.confirm("Discard this update?")) return;
    setComposing(open);
    if (!open) setDraftDirty(false);
  }

  function onPosted() {
    setComposing(false);
    setDraftDirty(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PetFacts
          pet={pet}
          part="header"
          title={<h1 className="text-3xl font-semibold tracking-tight">{pet.name}</h1>}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={actionColors.postUpdate}
            onClick={() => setComposing(true)}
          >
            <Megaphone aria-hidden /> Post update
          </Button>
          <Link
            href={petEditorEditHref(pet.id, petPath)}
            className={cn(buttonVariants({ variant: "outline" }), actionColors.editBio)}
          >
            <Pencil aria-hidden /> Edit bio
          </Link>
          <CopyLinkButton path={petPath} className={actionColors.copyLink} />
          <QrDownloadMenu
            url={absoluteUrl(petPath)}
            filenameBase={pet.name}
            triggerLabel="QR code"
            triggerClassName={actionColors.qrCode}
            triggerSize="default"
          />
        </div>
      </div>
      <OwnerAnalyticsWidget
        petId={pet.id}
        petName={pet.name}
        ownerRef={ownerRef}
        adopted={pet.status === "adopted"}
      />
      <PetInquiries petId={pet.id} petName={pet.name} ownerRef={ownerRef} />
      <Dialog open={composing} onOpenChange={onComposingChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update on {pet.name}</DialogTitle>
            <DialogDescription>
              Shows in the Updates section of {pet.name}&apos;s public page.
            </DialogDescription>
          </DialogHeader>
          {composing ? (
            <PostComposer
              petId={pet.id}
              className="border-0 p-0"
              onPosted={onPosted}
              onDirtyChange={setDraftDirty}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
