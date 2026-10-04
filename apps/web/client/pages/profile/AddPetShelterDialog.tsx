"use client";

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
import { Label } from "@client/components/ui/label";
import { FormEvent, useState } from "react";

type AddPetShelterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: Error | null;
  onSave: (shelter: { name: string; url: string }) => void;
};

export function AddPetShelterDialog({
  open,
  onOpenChange,
  pending,
  error,
  onSave,
}: AddPetShelterDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({ name: trimmedName, url: url.trim() });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setName("");
          setUrl("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a shelter</DialogTitle>
          <DialogDescription>
            Saved to your profile, then attached to this pet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" aria-label="Add shelter">
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="new-shelter-name">Shelter name</Label>
            <Input
              id="new-shelter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-shelter-url">Website</Label>
            <Input
              id="new-shelter-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : "Add shelter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
