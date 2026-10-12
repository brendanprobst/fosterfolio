"use client";

import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { cn } from "@client/lib/utils";
import { useState } from "react";

const STEPS = [
  {
    title: "Your default link is ready",
    body: <>This is your default link to the pets you foster.</>,
  },
  {
    title: "Track where adopters find you",
    body: (
      <>
        Create <em>tracked links</em> to see how adopters find you — one for your lawn sign, one
        for Instagram, and so on.
      </>
    ),
  },
] as const;

type FirstLinkIntroDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FirstLinkIntroDialog({ open, onOpenChange }: FirstLinkIntroDialogProps) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setStep(0);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription className="text-foreground text-base">{current.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="items-center sm:justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`} role="img">
            {STEPS.map((_, index) => (
              <span
                key={index}
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  index === step ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              if (last) {
                setStep(0);
                onOpenChange(false);
              } else {
                setStep(step + 1);
              }
            }}
          >
            {last ? "Got it" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
