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
import { cn } from "@client/lib/utils";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { InquiryForm, InquirySentAlert, type InquiryDraft } from "./InquiryForm";

type ExpandableInquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
  fosterName?: string;
};

export function ExpandableInquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
  fosterName,
}: ExpandableInquiryFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState<InquiryDraft>({
    senderName: "",
    senderEmail: "",
    message: "",
  });
  const inPanel = useInSidebarPanel();
  const [cardSlot, setCardSlot] = useState<HTMLDivElement | null>(null);
  const [modalSlot, setModalSlot] = useState<HTMLDivElement | null>(null);
  const target = expanded && modalSlot ? modalSlot : cardSlot;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          {!sent && !inPanel ? (
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
        <CardContent className={cn(!sent && !inPanel && "hidden lg:block")}>
          {sent ? <InquirySentAlert fosterName={fosterName} /> : <div ref={setCardSlot} />}
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
      {!sent && target
        ? createPortal(
            <InquiryForm
              targetUserId={targetUserId}
              targetPetId={targetPetId}
              heading={heading}
              showHeading={false}
              draft={draft}
              onDraftChange={setDraft}
              fosterName={fosterName}
              onSuccess={() => {
                setExpanded(false);
                setSent(true);
              }}
            />,
            target,
          )
        : null}
    </>
  );
}
