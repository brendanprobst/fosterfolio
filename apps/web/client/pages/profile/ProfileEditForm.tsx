"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import {
  handleEditConfirmMessage,
  handleEditDelta,
  normalizeHandleInput,
} from "@client/lib/userProfilePath";
import { FormEvent, useState } from "react";

type ProfileEditFormProps = {
  user: UserOwner;
  /** Called after a successful save so the host dialog can close itself. */
  onSaved?: () => void;
};

/**
 * Name, handle, and bio. Location/shelters live in `ProfileLocationCard` (inline,
 * no dialog); social links live in `SocialLinksDialog`.
 */
export function ProfileEditForm({ user, onSaved }: ProfileEditFormProps) {
  const mutation = useUpdateUserMutation();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [handle, setHandle] = useState(user.handle ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const delta = handleEditDelta(user.handle, handle);
    const confirmMessage = handleEditConfirmMessage(
      delta.kind,
      user.handle,
      delta.next,
    );
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    mutation.mutate(
      {
        id: user.id,
        payload: {
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          ...(delta.changed ? { handle: delta.next } : {}),
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
        <Label htmlFor="profile-handle">Handle</Label>
        <Input
          id="profile-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          placeholder="your-name"
        />
        <p className="text-muted-foreground text-xs">
          Public URL: /@{normalizeHandleInput(handle) || "your-name"}
        </p>
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
