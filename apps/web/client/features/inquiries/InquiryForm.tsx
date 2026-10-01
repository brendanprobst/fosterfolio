"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { Lock } from "lucide-react";
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

function lockedDraft(petName?: string): InquiryDraft {
  const subject = petName?.trim() || "this pet";
  return {
    senderName: "Alex Visitor",
    senderEmail: "visitor@example.com",
    message: `Hi! I'd love to learn more about ${subject} and how to apply.`,
  };
}

type InquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
  showHeading?: boolean;
  draft?: InquiryDraft;
  onDraftChange?: (draft: InquiryDraft) => void;
  /** Owner preview: sample values, no submit. */
  locked?: boolean;
  petName?: string;
};

export function InquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
  showHeading = true,
  draft,
  onDraftChange,
  locked = false,
  petName,
}: InquiryFormProps) {
  const mutation = useCreateInquiryMutation();
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  const value = locked ? lockedDraft(petName) : (draft ?? localDraft);
  const formLabel = locked ? `${heading} (preview)` : heading;
  const idSuffix = locked ? "-preview" : "";

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
    if (locked) return;
    mutation.mutate({
      targetUserId,
      senderName,
      senderEmail,
      message,
      ...(targetPetId ? { targetPetId } : {}),
    });
  }

  if (mutation.isSuccess) {
    return (
      <Alert>
        <AlertTitle>Inquiry sent</AlertTitle>
        <AlertDescription>
          The foster will get your message by email. You can reply if they write
          back.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" aria-label={formLabel}>
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
      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">
        <legend className="sr-only">{formLabel}</legend>
        <div className="space-y-1.5">
          <Label htmlFor={`inquiry-name${idSuffix}`}>Your name</Label>
          <Input
            id={`inquiry-name${idSuffix}`}
            name="senderName"
            value={senderName}
            onChange={(e) => updateDraft({ senderName: e.target.value })}
            required
            disabled={locked}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`inquiry-email${idSuffix}`}>Your email</Label>
          <Input
            id={`inquiry-email${idSuffix}`}
            name="senderEmail"
            type="email"
            value={senderEmail}
            onChange={(e) => updateDraft({ senderEmail: e.target.value })}
            required
            disabled={locked}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`inquiry-message${idSuffix}`}>Message</Label>
          <Textarea
            id={`inquiry-message${idSuffix}`}
            name="message"
            value={message}
            onChange={(e) => updateDraft({ message: e.target.value })}
            required
            disabled={locked}
            rows={5}
          />
        </div>
        <Button type="submit" disabled={locked || mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send inquiry"}
        </Button>
      </fieldset>
      {locked ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <Lock
              className="text-foreground size-32 opacity-40"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="bg-foreground text-background rounded-full px-3 py-1 text-center text-xs font-medium whitespace-nowrap">
              Locked for you, open to visitors
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
