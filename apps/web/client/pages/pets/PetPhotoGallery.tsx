"use client";

import { cn } from "@client/lib/utils";
import type { PetPhoto } from "@client/features/pets";
import { PawPrint } from "lucide-react";
import { useState } from "react";

type PetPhotoGalleryProps = {
  name: string;
  photos: PetPhoto[];
  primaryPhotoUrl: string | null;
};

/** Cover first, then the rest. A lone primary URL is a one-item gallery. */
export function galleryPhotoUrls(
  photos: PetPhoto[],
  primaryPhotoUrl: string | null,
): string[] {
  const fromPhotos = photos.map((photo) => photo.url).filter(Boolean);
  if (fromPhotos.length === 0) {
    return primaryPhotoUrl ? [primaryPhotoUrl] : [];
  }
  if (!primaryPhotoUrl || fromPhotos[0] === primaryPhotoUrl) return fromPhotos;
  return [primaryPhotoUrl, ...fromPhotos.filter((url) => url !== primaryPhotoUrl)];
}

export function PetPhotoGallery({
  name,
  photos,
  primaryPhotoUrl,
}: PetPhotoGalleryProps) {
  const urls = galleryPhotoUrls(photos, primaryPhotoUrl);
  const [index, setIndex] = useState(0);
  const selected = index >= 0 && index < urls.length ? index : 0;

  if (urls.length === 0) {
    return (
      <div className="border-border bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center rounded-xl border">
        <PawPrint aria-hidden className="size-10" />
      </div>
    );
  }

  const current = urls[selected] ?? urls[0];

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; absolute Supabase URLs */}
      <img
        src={current}
        alt={name}
        className="border-border aspect-[4/3] w-full rounded-xl border object-cover"
      />
      {urls.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Photos">
          {urls.map((url, photoIndex) => {
            const active = photoIndex === selected;
            return (
              <li key={`${url}-${photoIndex}`} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Show photo ${photoIndex + 1}`}
                  aria-pressed={active}
                  onClick={() => setIndex(photoIndex)}
                  className={cn(
                    "border-border overflow-hidden rounded-md border",
                    active && "ring-ring ring-2",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-16 object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
