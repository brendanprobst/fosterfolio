"use client";

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
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { InquiryForm, type InquiryDraft } from "./InquiryForm";

type ExpandableInquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
};

export function ExpandableInquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
}: ExpandableInquiryFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<InquiryDraft>({
    senderName: "",
    senderEmail: "",
    message: "",
  });
  const [cardSlot, setCardSlot] = useState<HTMLDivElement | null>(null);
  const [modalSlot, setModalSlot] = useState<HTMLDivElement | null>(null);
  const target = expanded && modalSlot ? modalSlot : cardSlot;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
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
        </CardHeader>
        <CardContent className="hidden lg:block">
          <div ref={setCardSlot} />
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
      {target
        ? createPortal(
            <InquiryForm
              targetUserId={targetUserId}
              targetPetId={targetPetId}
              heading={heading}
              showHeading={false}
              draft={draft}
              onDraftChange={setDraft}
            />,
            target,
          )
        : null}
    </>
  );
}
