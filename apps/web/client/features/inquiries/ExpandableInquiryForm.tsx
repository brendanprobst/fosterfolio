"use client";

import { useInSidebarPanel } from "@client/components/layout/sidebarPanelContext";
import { Button } from "@client/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { capturePetEvent } from "@client/lib/analytics/initFosterfolioAnalytics";
import { cn } from "@client/lib/utils";
import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Inquiry } from "./types";
import { InquiryForm, InquirySuccess, type InquiryDraft } from "./InquiryForm";

type ExpandableInquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
  fosterName?: string;
  petName?: string;
  capturePetEvents?: boolean;
};

export function ExpandableInquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
  fosterName,
  petName,
  capturePetEvents = false,
}: ExpandableInquiryFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [sentInquiry, setSentInquiry] = useState<Inquiry | null>(null);
  const [draft, setDraft] = useState<InquiryDraft>({
    senderName: "",
    senderEmail: "",
    message: "",
    zipCode: "",
  });
  const inPanel = useInSidebarPanel();
  const formOpened = useRef(false);

  useEffect(() => {
    if (!capturePetEvents || !targetPetId || formOpened.current) return;
    const desktop =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 1024px)").matches;
    if (!expanded && !desktop && !inPanel) return;
    formOpened.current = true;
    void capturePetEvent("inquiry_form_opened", {
      id: targetPetId,
      ownerId: targetUserId,
    });
  }, [capturePetEvents, expanded, inPanel, targetPetId, targetUserId]);
  const [cardSlot, setCardSlot] = useState<HTMLDivElement | null>(null);
  const [modalSlot, setModalSlot] = useState<HTMLDivElement | null>(null);
  const target = expanded && modalSlot ? modalSlot : cardSlot;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          {!sentInquiry && !inPanel ? (
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Expand"
                onClick={() => setExpanded(true)}
              >
                <Maximize2 aria-hidden />
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className={cn(!sentInquiry && !inPanel && "hidden lg:block")}>
          {sentInquiry ? (
            <InquirySuccess
              fosterName={fosterName}
              petName={petName}
              inquiry={sentInquiry}
            />
          ) : (
            <div ref={setCardSlot} />
          )}
        </CardContent>
      </Card>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="top-4 right-4 bottom-4 left-4 max-h-none w-auto max-w-none translate-x-0 translate-y-0">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>
              Send a message about this pet. The foster will get it by email.
            </DialogDescription>
          </DialogHeader>
          <div ref={setModalSlot} />
        </DialogContent>
      </Dialog>
      {!sentInquiry && target
        ? createPortal(
            <InquiryForm
              targetUserId={targetUserId}
              targetPetId={targetPetId}
              heading={heading}
              showHeading={false}
              draft={draft}
              onDraftChange={setDraft}
              fosterName={fosterName}
              petName={petName}
              capturePetEvents={capturePetEvents}
              onSuccess={(inquiry) => {
                setExpanded(false);
                setSentInquiry(inquiry);
              }}
            />,
            target,
          )
        : null}
    </>
  );
}
