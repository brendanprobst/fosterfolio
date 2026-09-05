"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useCreateInquiryMutation } from "./useCreateInquiry";
import { FormEvent, useState } from "react";

type InquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
};

export function InquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
}: InquiryFormProps) {
  const mutation = useCreateInquiryMutation();
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    <form onSubmit={onSubmit} className="space-y-4" aria-label={heading}>
      <h2 className="text-lg font-medium">{heading}</h2>
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
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-name">Your name</Label>
        <Input
          id="inquiry-name"
          name="senderName"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          required
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
          onChange={(e) => setSenderEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inquiry-message">Message</Label>
        <Textarea
          id="inquiry-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
