"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import type { PetPublic } from "@client/features/pets";
import { PetEditor } from "./PetEditor";

type PetEditorDialogProps = {
  pet: PetPublic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Add or edit a pet from `/profile`. The card list stays in place; this dialog
 * remounts the form each time it opens so unsaved edits do not leak.
 */
export function PetEditorDialog({ pet, open, onOpenChange }: PetEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pet ? `Edit ${pet.name}` : "Add a pet"}</DialogTitle>
          <DialogDescription>
            {pet
              ? "Update this pet’s bio page — photo, status, and the details adopters see."
              : "Create a shareable bio page and a QR code for their collar tag."}
          </DialogDescription>
        </DialogHeader>
        {open ? <PetEditor pet={pet} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
