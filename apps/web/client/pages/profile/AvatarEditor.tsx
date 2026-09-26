"use client";

import { UserAvatar } from "@client/components/UserAvatar";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { useMediaUpload } from "@client/features/storage";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { Pencil } from "lucide-react";
import { useRef } from "react";

type AvatarEditorProps = {
  user: UserOwner;
};

/**
 * Owner-only picture control for `/profile`. The public profile renders `UserAvatar`
 * directly so it has no edit affordance.
 *
 * Saves on its own rather than through `ProfileEditForm`: the payload carries only
 * `avatarUrl`, and the API applies just the keys present in the body.
 */
export function AvatarEditor({ user }: AvatarEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMediaUpload();
  const updateUser = useUpdateUserMutation();

  const pending = upload.isPending || updateUser.isPending;
  const error = upload.error ?? updateUser.error;

  async function save(avatarUrl: string | null) {
    try {
      await updateUser.mutateAsync({ id: user.id, payload: { avatarUrl } });
    } catch {
      // Surfaced through `updateUser.error` below.
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const uploaded = await upload.mutateAsync(file);
      await save(uploaded.publicUrl);
    } catch {
      // Surfaced through `upload.error` below.
    }
  }

  return (
    <section className="space-y-3" aria-label="Profile picture">
      {error instanceof Error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not update your picture</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar name={user.displayName} url={user.avatarUrl} size="xl" />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label="Change profile picture"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
            className="border-background absolute -right-1 -bottom-1 rounded-full border-2 shadow-sm"
          >
            <Pencil aria-hidden />
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            // `hidden`, not `sr-only`: the button above is the accessible control, so an
            // unlabeled file input should stay out of the accessibility tree.
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Reset so re-picking the same file fires `change` again.
              event.target.value = "";
              void onPickFile(file);
            }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-muted-foreground text-sm">
            {pending ? "Uploading…" : "JPEG, PNG, WebP, or GIF."}
          </p>
          {user.avatarUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => void save(null)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
