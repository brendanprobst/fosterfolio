"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import type { UserOwner } from "@client/features/users";
import { ProfileEditForm } from "./ProfileEditForm";

type ProfileEditDialogProps = {
  user: UserOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Everything except the picture is read-only on the page and edited here, so the
 * profile stays scannable. Closing unmounts the form, which resets any unsaved edits.
 */
export function ProfileEditDialog({ user, open, onOpenChange }: ProfileEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Name, bio, location, shelters, and links. Your picture is edited from the
            header.
          </DialogDescription>
        </DialogHeader>
        <ProfileEditForm user={user} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
