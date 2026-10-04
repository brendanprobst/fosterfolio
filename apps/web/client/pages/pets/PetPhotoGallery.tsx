"use client";

import { cn } from "@client/lib/utils";
import type { PetPhoto } from "@client/features/pets";
import { PawPrint } from "lucide-react";
import { useRef, useState, type TouchEvent } from "react";

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

const SWIPE_THRESHOLD_PX = 48;

/** Horizontal swipe that should change the photo. Left is next, right is previous. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

export function PetPhotoGallery({
  name,
  photos,
  primaryPhotoUrl,
}: PetPhotoGalleryProps) {
  const urls = galleryPhotoUrls(photos, primaryPhotoUrl);
  const [index, setIndex] = useState(0);
  const selected = index >= 0 && index < urls.length ? index : 0;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(event: TouchEvent<HTMLImageElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLImageElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || urls.length < 2) return;
    const step = swipeStep(touch.clientX - start.x, touch.clientY - start.y);
    if (step === 0) return;
    setIndex((current) => {
      const base = current >= 0 && current < urls.length ? current : 0;
      return (base + step + urls.length) % urls.length;
    });
  }

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
        draggable={false}
        className="border-border aspect-[4/3] w-full touch-pan-y rounded-xl border object-cover"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          swipeStart.current = null;
        }}
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
