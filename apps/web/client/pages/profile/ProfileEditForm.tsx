"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import { FormEvent, useState } from "react";

type ProfileEditFormProps = {
  user: UserOwner;
  /** Called after a successful save so the host dialog can close itself. */
  onSaved?: () => void;
};

/**
 * Name and bio only. Location/shelters live in `ProfileLocationCard` (inline, no
 * dialog); social links live in `SocialLinksDialog`. Splitting these out keeps this
 * form — and the header it feeds — small.
 */
export function ProfileEditForm({ user, onSaved }: ProfileEditFormProps) {
  const mutation = useUpdateUserMutation();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: user.id,
        payload: {
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
        },
      },
      { onSuccess: () => onSaved?.() },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit name and bio">
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to save profile."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-bio">Bio (markdown)</Label>
        <Textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
