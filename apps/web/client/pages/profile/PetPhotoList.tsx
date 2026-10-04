"use client";

import { Button } from "@client/components/ui/button";
import type { PetPhoto } from "@client/features/pets";

type PetPhotoListProps = {
  photos: PetPhoto[];
  pending: boolean;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
};

export function PetPhotoList({ photos, pending, onDelete, onMove }: PetPhotoListProps) {
  if (photos.length === 0) {
    return <p className="text-muted-foreground text-sm">No photos yet.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Pet photos">
      {photos.map((photo, index) => (
        <li
          key={`${photo.url}-${index}`}
          className="border-border flex flex-wrap items-center gap-3 rounded-md border p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Pet photo ${index + 1}`}
            className="border-border size-16 rounded-md border object-cover"
          />
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
            {index === 0 ? "Cover" : `Photo ${index + 1}`}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || index === 0}
              onClick={() => onMove(index, -1)}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || index === photos.length - 1}
              onClick={() => onMove(index, 1)}
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              aria-label={`Delete photo ${index + 1}`}
              onClick={() => onDelete(index)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
