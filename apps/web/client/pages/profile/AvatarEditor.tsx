"use client";

import { UserAvatar } from "@client/components/UserAvatar";
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
import { useMediaUpload } from "@client/features/storage";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

type AvatarEditorProps = {
  user: UserOwner;
};

/**
 * Owner-only picture control for `/profile`. The pencil opens a dialog rather than an
 * inline panel — the earlier floating-panel version shifted the header's layout when
 * it expanded. The public profile renders `UserAvatar` directly, with no edit
 * affordance at all.
 *
 * Saves on its own rather than through `ProfileEditForm`: the payload carries only
 * `avatarUrl`, and the API applies just the keys present in the body.
 */
export function AvatarEditor({ user }: AvatarEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const upload = useMediaUpload();
  const updateUser = useUpdateUserMutation();

  const hasPicture = Boolean(user.avatarUrl);
  const pending = upload.isPending || updateUser.isPending;
  const error = upload.error ?? updateUser.error;

  async function save(avatarUrl: string | null) {
    try {
      await updateUser.mutateAsync({ id: user.id, payload: { avatarUrl } });
      setOpen(false);
    } catch {
      // Surfaced through `updateUser.error` below; stay open so the retry is visible.
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const uploaded = await upload.mutateAsync(file);
      await save(uploaded.publicUrl);
    } catch {
      // Surfaced through `upload.error` below; stay open so the retry is visible.
    }
  }

  return (
    <section className="w-fit shrink-0" aria-label="Profile picture">
      <div className="relative">
        <UserAvatar name={user.displayName} url={user.avatarUrl} size="xl" />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Edit profile picture"
          onClick={() => setOpen(true)}
          className="border-background absolute -right-1 -bottom-1 rounded-full border-2 shadow-sm"
        >
          <Pencil aria-hidden />
        </Button>
      </div>

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile picture</DialogTitle>
            <DialogDescription>
              JPEG, PNG, WebP, or GIF. Large images are resized for you.
            </DialogDescription>
          </DialogHeader>

          {error instanceof Error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update your picture</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col items-center gap-3 py-2">
            <UserAvatar name={user.displayName} url={user.avatarUrl} size="2xl" />
            {pending ? (
              <p className="text-muted-foreground text-sm">Uploading…</p>
            ) : null}
          </div>

          <DialogFooter className="flex flex-row justify-center items-center gap-2">
            <Button
              type="button"
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
                variant="ghost"
                disabled={pending}
                onClick={() => void save(null)}
              >
                <Trash2 aria-hidden />
                Clear profile picture
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
