"use client";

import { Button } from "@client/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@client/components/ui/sheet";
import { capturePetEvent } from "@client/lib/analytics/initFosterfolioAnalytics";
import { Check, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { InquiryForm, InquirySuccess, type InquiryDraft } from "./InquiryForm";
import type { Inquiry } from "./types";

const EMPTY: InquiryDraft = { senderName: "", senderEmail: "", message: "", zipCode: "" };

type InquiryCtaProps = {
  targetUserId: string;
  targetPetId: string;
  petName: string;
  fosterName?: string;
  capturePetEvents?: boolean;
  /** Owner preview: static, disabled, not floating. */
  preview?: boolean;
};

export function InquiryCta({
  targetUserId,
  targetPetId,
  petName,
  fosterName,
  capturePetEvents = false,
  preview = false,
}: InquiryCtaProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<Inquiry | null>(null);
  const [draft, setDraft] = useState<InquiryDraft>(EMPTY);
  const captured = useRef(false);
  const label = `Ask about ${petName}`;

  if (preview) {
    return (
      <div className="border-border space-y-1 rounded-xl border border-dashed p-4 text-center">
        <Button type="button" size="lg" className="rounded-full" disabled>
          <MessageCircle aria-hidden /> {label}
        </Button>
        <p className="text-muted-foreground text-xs">
          Visitors see this button floating at the bottom of the page.
        </p>
      </div>
    );
  }

  function openSheet() {
    setOpen(true);
    if (capturePetEvents && !captured.current) {
      captured.current = true;
      void capturePetEvent("inquiry_form_opened", { id: targetPetId, ownerId: targetUserId });
    }
  }

  return (
    <>
      {!open ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-3xl justify-end px-4">
            {sent ? (
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-auto max-w-full min-w-0 whitespace-normal rounded-full shadow-md"
                onClick={() => setOpen(true)}
              >
                <Check aria-hidden /> Inquiry sent
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="pointer-events-auto max-w-full min-w-0 whitespace-normal rounded-full shadow-lg"
                onClick={openSheet}
              >
                <MessageCircle aria-hidden /> {label}
              </Button>
            )}
          </div>
        </div>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] w-[min(48rem,calc(100%-2rem))] overflow-y-auto rounded-t-2xl border-x data-[side=bottom]:inset-x-0 data-[side=bottom]:mx-auto"
        >
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              {fosterName || "The foster"} will get your message by email.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {sent ? (
              <InquirySuccess fosterName={fosterName} petName={petName} inquiry={sent} />
            ) : (
              <InquiryForm
                targetUserId={targetUserId}
                targetPetId={targetPetId}
                heading="Contact the foster"
                showHeading={false}
                draft={draft}
                onDraftChange={setDraft}
                fosterName={fosterName}
                petName={petName}
                capturePetEvents={capturePetEvents}
                onSuccess={setSent}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
