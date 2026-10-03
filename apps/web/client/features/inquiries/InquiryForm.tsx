"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useCreateInquiryMutation } from "./useCreateInquiry";
import { FormEvent, useState } from "react";

export type InquiryDraft = {
  senderName: string;
  senderEmail: string;
  message: string;
};

const emptyDraft: InquiryDraft = {
  senderName: "",
  senderEmail: "",
  message: "",
};

export function inquirySentDescription(fosterName?: string): string {
  const recipient = fosterName?.trim() || "The foster";
  return `${recipient} will get your message by email. You can reply if they write back.`;
}

export function InquirySentAlert({ fosterName }: { fosterName?: string }) {
  return (
    <Alert>
      <AlertTitle>Inquiry sent</AlertTitle>
      <AlertDescription>{inquirySentDescription(fosterName)}</AlertDescription>
    </Alert>
  );
}

type InquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
  showHeading?: boolean;
  draft?: InquiryDraft;
  onDraftChange?: (draft: InquiryDraft) => void;
  fosterName?: string;
  onSuccess?: () => void;
};

export function InquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
  showHeading = true,
  draft,
  onDraftChange,
  fosterName,
  onSuccess,
}: InquiryFormProps) {
  const mutation = useCreateInquiryMutation();
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  const value = draft ?? localDraft;

  function updateDraft(patch: Partial<InquiryDraft>) {
    const next = { ...value, ...patch };
    if (onDraftChange) {
      onDraftChange(next);
      return;
    }
    setLocalDraft(next);
  }

  const { senderName, senderEmail, message } = value;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        targetUserId,
        senderName,
        senderEmail,
        message,
        ...(targetPetId ? { targetPetId } : {}),
      },
      { onSuccess },
    );
  }

  if (mutation.isSuccess) {
    return <InquirySentAlert fosterName={fosterName} />;
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" aria-label={heading}>
      {showHeading ? <h2 className="text-lg font-medium">{heading}</h2> : null}
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not send</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to send inquiry."}
          </AlertDescription>
        </Alert>
      ) : null}
      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-4 border-0 p-0">
        <legend className="sr-only">{heading}</legend>
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-name">Your name</Label>
          <Input
            id="inquiry-name"
            name="senderName"
            value={senderName}
            onChange={(e) => updateDraft({ senderName: e.target.value })}
            required
            disabled={mutation.isPending}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-email">Your email</Label>
          <Input
            id="inquiry-email"
            name="senderEmail"
            type="email"
            value={senderEmail}
            onChange={(e) => updateDraft({ senderEmail: e.target.value })}
            required
            disabled={mutation.isPending}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-message">Message</Label>
          <Textarea
            id="inquiry-message"
            name="message"
            value={message}
            onChange={(e) => updateDraft({ message: e.target.value })}
            required
            disabled={mutation.isPending}
            rows={5}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send inquiry"}
        </Button>
      </fieldset>
    </form>
  );
}
