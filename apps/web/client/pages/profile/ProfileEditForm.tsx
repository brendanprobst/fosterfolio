"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { HANDLE_CHANGE_TIP_TEXT, markHandleChangeTipSeen, shouldShowHandleChangeTip } from "@client/lib/handleChangeTip";
import { ApiRequestError } from "@client/lib/readApiError";
import { MarkdownEditor } from "@client/components/markdown";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
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

const HANDLE_LIMIT_TEXT = "You can change your handle 2 times every 30 days.";

/** The server message, or for the handle cooldown the date the next change opens up. */
function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === "HANDLE_CHANGE_LIMIT") {
    const raw = error.metadata?.nextChangeAt;
    const date = typeof raw === "string" ? new Date(raw) : null;
    if (date && !Number.isNaN(date.getTime())) {
      return `You can change your handle again on ${date.toLocaleDateString(undefined, { dateStyle: "long" })}.`;
    }
  }
  return error instanceof Error ? error.message : "Failed to save profile.";
}

/**
 * Name, handle, and bio. The picture is `AvatarEditor`, embedded beside this
 * form in `ProfileEditDialog`. Location/shelters live in `ProfileLocationDialog`;
 * social links live in `SocialLinksDialog`.
 */
export function ProfileEditForm({ user, onSaved }: ProfileEditFormProps) {
  const mutation = useUpdateUserMutation();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [handle, setHandle] = useState(user.handle ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [handleChanged, setHandleChanged] = useState<{ handle: string; showTip: boolean } | null>(null);

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
      {
        onSuccess: () => {
          // Only an existing handle changing counts; setting a first handle does not.
          if (delta.changed && user.handle) {
            const showTip = shouldShowHandleChangeTip();
            if (showTip) markHandleChangeTipSeen();
            setHandleChanged({ handle: delta.next ?? "", showTip });
            return;
          }
          onSaved?.();
        },
      },
    );
  }

  if (handleChanged) {
    return (
      <div className="space-y-4" role="status">
        <Alert>
          <AlertTitle>Handle updated</AlertTitle>
          <AlertDescription>
            Your public URL is now /@{handleChanged.handle}.
          </AlertDescription>
        </Alert>
        {handleChanged.showTip ? (
          <Alert>
            <AlertTitle>Good to know</AlertTitle>
            <AlertDescription>{HANDLE_CHANGE_TIP_TEXT}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          onClick={() => {
            setHandleChanged(null);
            onSaved?.();
          }}
        >{handleChanged.showTip ? "Got it" : "Done"}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit name and bio">
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>
            {saveErrorMessage(mutation.error)}
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
        <p className="text-muted-foreground text-xs">{HANDLE_LIMIT_TEXT}</p>
      </div>
      <div className="space-y-1.5">
        <Label id="profile-bio-label">Bio</Label>
        <MarkdownEditor
          id="profile-bio"
          aria-labelledby="profile-bio-label"
          value={bio}
          onChange={setBio}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
