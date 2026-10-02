"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Input } from "@client/components/ui/input";
import { useUpdateUserMutation } from "@client/features/users";
import type { SocialLink, UserOwner } from "@client/features/users";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type SocialLinksDialogProps = {
  user: UserOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Places this foster posts about their animals. Opened from the "Where you share"
 * card. Shelter websites belong on the location card, not here.
 */
export function SocialLinksDialog({ user, open, onOpenChange }: SocialLinksDialogProps) {
  const mutation = useUpdateUserMutation();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(user.socialLinks);

  // Re-seed the draft from the latest saved links each time the dialog opens, so a
  // reopen after cancelling never shows a stale edit.
  useEffect(() => {
    if (open) setSocialLinks(user.socialLinks);
  }, [open, user.socialLinks]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: user.id,
        payload: {
          socialLinks: socialLinks.filter((link) => link.label.trim() && link.url.trim()),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Where you share</DialogTitle>
          <DialogDescription>
            Instagram, a foster diary, a TikTok — anywhere you post about the animals
            you foster. Shelter websites belong with location.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3" aria-label="Edit where you share">
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to save."}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <div className="divide-y divide-border lg:divide-y-0">
            {socialLinks.map((link, index) => (
              <div key={index} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:py-0">
                <Input
                  aria-label={`Link ${index + 1} label`}
                  placeholder="Label"
                  className="w-full lg:flex-1"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...link, label: e.target.value };
                    setSocialLinks(next);
                  }}
                />
                <Input
                  aria-label={`Link ${index + 1} URL`}
                  placeholder="https://"
                  className="w-full lg:flex-1"
                  value={link.url}
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...link, url: e.target.value };
                    setSocialLinks(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground self-end lg:size-7 lg:self-center lg:px-0"
                  aria-label={`Remove link ${index + 1}`}
                  onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden />
                  <span className="lg:sr-only">Remove</span>
                </Button>
              </div>
            ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSocialLinks([...socialLinks, { label: "", url: "" }])}
            >
              <Plus aria-hidden />
              Add link
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
