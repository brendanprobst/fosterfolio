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
 * Name and bio only — the two fields tightly coupled with the avatar in the header.
 * Location/shelters and social links have their own editors. Closing unmounts the
 * form, which resets any unsaved edits.
 */
export function ProfileEditDialog({ user, open, onOpenChange }: ProfileEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit name & bio</DialogTitle>
          <DialogDescription>
            Shown at the top of your profile, next to your picture.
          </DialogDescription>
        </DialogHeader>
        <ProfileEditForm user={user} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
