"use client";

import { UserAvatar } from "@client/components/UserAvatar";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { useMediaUpload } from "@client/features/storage";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { Check, Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

type AvatarEditorProps = {
  user: UserOwner;
};

/**
 * Owner-only picture control for `/profile`, in two states: viewing shows just the
 * picture and its edit toggle; editing floats the options and helper text below it so
 * the surrounding header row keeps its height. The public profile renders `UserAvatar`
 * directly so it has no edit affordance at all.
 *
 * Saves on its own rather than through `ProfileEditForm`: the payload carries only
 * `avatarUrl`, and the API applies just the keys present in the body.
 */
export function AvatarEditor({ user }: AvatarEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const upload = useMediaUpload();
  const updateUser = useUpdateUserMutation();

  const hasPicture = Boolean(user.avatarUrl);
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
    <section className="relative w-fit shrink-0" aria-label="Profile picture">
      <UserAvatar name={user.displayName} url={user.avatarUrl} size="xl" />
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        aria-label={editing ? "Done editing profile picture" : "Edit profile picture"}
        aria-expanded={editing}
        onClick={() => setEditing((open) => !open)}
        className="border-background absolute -right-1 -bottom-1 rounded-full border-2 shadow-sm"
      >
        {editing ? <Check aria-hidden /> : <Pencil aria-hidden />}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        // `hidden`, not `sr-only`: the buttons are the accessible controls, so an
        // unlabeled file input should stay out of the accessibility tree.
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so re-picking the same file fires `change` again.
          event.target.value = "";
          void onPickFile(file);
        }}
      />
      {editing ? (
        <div className="bg-card ring-foreground/10 absolute top-full left-0 z-20 mt-2 w-72 space-y-3 rounded-xl p-3 shadow-lg ring-1">
          {error instanceof Error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update your picture</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {hasPicture ? "Profile picture set" : "No profile picture yet"}
            </p>
            <p className="text-muted-foreground text-sm">
              {pending
                ? "Uploading…"
                : "JPEG, PNG, WebP, or GIF. Large images are resized for you."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden />
              {hasPicture ? "Replace image" : "Add image"}
            </Button>
            {hasPicture ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => void save(null)}
              >
                <Trash2 aria-hidden />
                Clear profile picture
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
