"use client";

import { Button } from "@client/components/ui/button";
import { PawPrint, Plus } from "lucide-react";

type PetsEmptyStateProps = {
  onAddPet: () => void;
};

export function PetsEmptyState({ onAddPet }: PetsEmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <PawPrint className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-medium">No pets yet</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          Add your first foster to publish a shareable bio page and a QR code for their
          collar tag.
        </p>
      </div>
      <Button type="button" size="sm" onClick={onAddPet}>
        <Plus aria-hidden />
        Add your first pet
      </Button>
    </div>
  );
}
