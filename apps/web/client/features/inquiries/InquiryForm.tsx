"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  capturePetEvent,
  petReachedViaFosterMe,
  readFosterfolioSource,
} from "@client/lib/analytics/initFosterfolioAnalytics";
import { ensureAttribution } from "@lattice/analytics";
import { FormEvent, useEffect, useRef, useState } from "react";
import { reportInquirySource } from "./inquiriesApi";
import { useCreateInquiryMutation } from "./useCreateInquiry";
import type { Inquiry } from "./types";

export const SELF_REPORTED_SOURCE_OPTIONS = [
  "Lawn sign",
  "Instagram",
  "Facebook",
  "Friend or family",
  "Shelter",
  "Search",
  "Other",
] as const;

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export type InquiryDraft = {
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode: string;
};

const emptyDraft: InquiryDraft = {
  senderName: "",
  senderEmail: "",
  message: "",
  zipCode: "",
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

type InquirySuccessProps = {
  fosterName?: string;
  petName?: string;
  inquiry: Inquiry | null;
};

export function InquirySuccess({ fosterName, petName, inquiry }: InquirySuccessProps) {
  const source = readFosterfolioSource();
  const ask =
    Boolean(petName) && source?.channelKey === "direct" && Boolean(inquiry?.sourceToken);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(option: string) {
    if (!inquiry) return;
    setError(null);
    try {
      await reportInquirySource(inquiry.id, inquiry.sourceToken, option);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that answer.");
    }
  }

  return (
    <div className="space-y-4">
      <InquirySentAlert fosterName={fosterName} />
      {ask && !done ? (
        <fieldset className="space-y-3 border-0 p-0">
          <legend className="text-sm font-medium">How did you hear about {petName}?</legend>
          <div className="flex flex-wrap gap-2">
            {SELF_REPORTED_SOURCE_OPTIONS.map((option) => (
              <Button key={option} type="button" variant="outline" onClick={() => void choose(option)}>
                {option}
              </Button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setDone(true)}>
              Skip
            </Button>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </fieldset>
      ) : null}
    </div>
  );
}

type TurnstileHandle = {
  execute: () => Promise<string>;
};

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** An invisible challenge normally takes a second or two. Past this, ask the visitor to retry. */
const TURNSTILE_EXECUTE_TIMEOUT_MS = 20000;

export const TURNSTILE_UNAVAILABLE_MESSAGE =
  "The spam check didn't load. If you use an ad or privacy blocker, allow challenges.cloudflare.com, then try again.";
export const TURNSTILE_FAILED_MESSAGE =
  "We couldn't confirm you're a person. Please try again.";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          size: "invisible";
          execution: "execute";
          callback: (token: string) => void;
          "error-callback": () => void;
        },
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

function InvisibleTurnstile({
  siteKey,
  onReady,
}: {
  siteKey: string;
  onReady: (handle: TurnstileHandle) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    const resolver = { current: null as ((token: string) => void) | null };

    const mount = () => {
      if (cancelled || !hostRef.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        size: "invisible",
        execution: "execute",
        callback: (token) => resolver.current?.(token),
        "error-callback": () => resolver.current?.(""),
      });
      onReadyRef.current({
        execute: () =>
          new Promise((resolve, reject) => {
            if (!widgetId || !window.turnstile) {
              reject(new Error(TURNSTILE_UNAVAILABLE_MESSAGE));
              return;
            }
            const timer = setTimeout(
              () => resolver.current?.(""),
              TURNSTILE_EXECUTE_TIMEOUT_MS,
            );
            resolver.current = (token) => {
              clearTimeout(timer);
              resolver.current = null;
              if (!token) {
                reject(new Error(TURNSTILE_FAILED_MESSAGE));
                return;
              }
              resolve(token);
            };
            // Tokens are single-use, and a solved widget won't run again until it is reset.
            window.turnstile.reset(widgetId);
            window.turnstile.execute(widgetId);
          }),
      });
    };

    if (window.turnstile) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
      );
      const script = existing ?? document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", mount);
      if (!existing) document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  return <div ref={hostRef} />;
}

type InquiryFormProps = {
  targetUserId: string;
  targetPetId?: string | null;
  heading?: string;
  showHeading?: boolean;
  draft?: InquiryDraft;
  onDraftChange?: (draft: InquiryDraft) => void;
  fosterName?: string;
  petName?: string;
  capturePetEvents?: boolean;
  onSuccess?: (inquiry: Inquiry) => void;
};

export function InquiryForm({
  targetUserId,
  targetPetId,
  heading = "Contact the foster",
  showHeading = true,
  draft,
  onDraftChange,
  fosterName,
  petName,
  capturePetEvents = false,
  onSuccess,
}: InquiryFormProps) {
  const mutation = useCreateInquiryMutation();
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  const [localInquiry, setLocalInquiry] = useState<Inquiry | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const value = draft ?? localDraft;

  function updateDraft(patch: Partial<InquiryDraft>) {
    const next = { ...value, ...patch };
    if (onDraftChange) {
      onDraftChange(next);
      return;
    }
    setLocalDraft(next);
  }

  const { senderName, senderEmail, message, zipCode } = value;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (verifying || mutation.isPending) return;
    setVerifyError(null);
    let turnstileToken: string | undefined;
    if (TURNSTILE_SITE_KEY) {
      // Not ready: the script is still loading, or a blocker stopped it.
      if (!turnstileRef.current) {
        setVerifyError(TURNSTILE_UNAVAILABLE_MESSAGE);
        return;
      }
      setVerifying(true);
      try {
        turnstileToken = await turnstileRef.current.execute();
      } catch (err) {
        setVerifyError(err instanceof Error ? err.message : TURNSTILE_FAILED_MESSAGE);
        return;
      } finally {
        setVerifying(false);
      }
    }
    try {
      await ensureAttribution();
    } catch {
      // A failed resolve must not block the inquiry email.
    }
    const source = readFosterfolioSource();
    const linkMatches =
      !source?.targetId || !targetPetId || source.targetId === targetPetId;
    mutation.mutate(
      {
        targetUserId,
        senderName,
        senderEmail,
        message,
        ...(zipCode.trim() ? { zipCode: zipCode.trim() } : {}),
        ...(targetPetId ? { targetPetId } : {}),
        ...(source && linkMatches && source.linkId ? { sourceLinkId: source.linkId } : {}),
        ...(source?.channelKey ? { sourceChannelKey: source.channelKey } : {}),
        ...(targetPetId && petReachedViaFosterMe(targetPetId) ? { viaFosterMe: true } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
      },
      {
        onSuccess: (inquiry) => {
          if (capturePetEvents && targetPetId) {
            void capturePetEvent("inquiry_submitted", {
              id: targetPetId,
              ownerId: targetUserId,
            });
          }
          setLocalInquiry(inquiry);
          onSuccess?.(inquiry);
        },
      },
    );
  }

  const busy = verifying || mutation.isPending;

  if (mutation.isSuccess && !onSuccess) {
    return (
      <InquirySuccess fosterName={fosterName} petName={petName} inquiry={localInquiry} />
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="relative space-y-4" aria-label={heading}>
      {showHeading ? <h2 className="text-lg font-medium">{heading}</h2> : null}
      {verifyError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not send</AlertTitle>
          <AlertDescription>{verifyError}</AlertDescription>
        </Alert>
      ) : mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not send</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to send inquiry."}
          </AlertDescription>
        </Alert>
      ) : null}
      <fieldset disabled={busy} className="min-w-0 space-y-4 border-0 p-0">
        <legend className="sr-only">{heading}</legend>
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-name">Your name</Label>
          <Input
            id="inquiry-name"
            name="senderName"
            value={senderName}
            onChange={(e) => updateDraft({ senderName: e.target.value })}
            required
            disabled={busy}
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
            disabled={busy}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inquiry-zip">ZIP code (optional)</Label>
          <Input
            id="inquiry-zip"
            name="zipCode"
            value={zipCode}
            onChange={(e) => updateDraft({ zipCode: e.target.value })}
            disabled={busy}
            autoComplete="postal-code"
            inputMode="numeric"
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
            disabled={busy}
            rows={5}
          />
        </div>
        {TURNSTILE_SITE_KEY ? (
          <InvisibleTurnstile
            siteKey={TURNSTILE_SITE_KEY}
            onReady={(handle) => {
              turnstileRef.current = handle;
            }}
          />
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send inquiry"}
        </Button>
      </fieldset>
    </form>
  );
}
