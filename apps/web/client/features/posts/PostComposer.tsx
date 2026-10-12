"use client";

import { useAuth } from "@client/auth";
import { MarkdownEditor } from "@client/components/markdown";
import { PhotoDropzone } from "@client/components/PhotoDropzone";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Label } from "@client/components/ui/label";
import { useOwnerPets } from "@client/features/pets";
import { useMediaUpload } from "@client/features/storage";
import { cn } from "@client/lib/utils";
import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { PostType } from "./types";
import { useCreatePostMutation } from "./useCreatePost";

type PostComposerProps = {
  /** Lock the composer to an update about this pet (hides the type toggle and pet picker). */
  petId?: string;
  onPosted?: () => void;
  /** Fires when the draft gains or loses unsaved text / photo, e.g. to confirm before closing. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Merged onto the form frame; pass `border-0 p-0` inside a dialog. */
  className?: string;
};

export function PostComposer({
  petId: fixedPetId,
  onPosted,
  onDirtyChange,
  className,
}: PostComposerProps = {}) {
  const { user } = useAuth();
  const petsQuery = useOwnerPets(fixedPetId ? null : (user?.id ?? null));
  const createPost = useCreatePostMutation();
  const upload = useMediaUpload();
  const [postType, setPostType] = useState<PostType>(fixedPetId ? "pet_update" : "general");
  const [pickedPetId, setPickedPetId] = useState("");
  const petId = fixedPetId ?? pickedPetId;
  const [bodyText, setBodyText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const dirty = bodyText.trim() !== "" || imageUrl !== null;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const pets = petsQuery.data ?? [];
  const errorMessage =
    createPost.error instanceof Error
      ? createPost.error.message
      : upload.error instanceof Error
        ? upload.error.message
        : null;

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const result = await upload.mutateAsync(file);
      setImageUrl(result.publicUrl);
    } catch {
      // Surfaced through `upload.error` in the alert below.
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    createPost.mutate(
      {
        postType,
        bodyText,
        ...(imageUrl ? { imageUrl } : {}),
        ...(postType === "pet_update" && petId ? { petId } : {}),
      },
      {
        onSuccess: () => {
          setBodyText("");
          setImageUrl(null);
          onPosted?.();
        },
      },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("border-border space-y-3 rounded-xl border p-4", className)}
      aria-label="Compose post"
    >
      {fixedPetId ? null : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={postType === "general" ? "default" : "outline"}
            onClick={() => setPostType("general")}
          >
            General
          </Button>
          <Button
            type="button"
            size="sm"
            variant={postType === "pet_update" ? "default" : "outline"}
            onClick={() => setPostType("pet_update")}
          >
            Pet update
          </Button>
        </div>
      )}
      {postType === "pet_update" && !fixedPetId ? (
        <div className="space-y-1.5">
          <Label htmlFor="composer-pet">Pet</Label>
          <select
            id="composer-pet"
            className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
            value={petId}
            onChange={(e) => setPickedPetId(e.target.value)}
            required
          >
            <option value="">Select a pet</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
          {pets.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Add a pet on your profile before posting an update.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label id="composer-body-label">What&apos;s happening?</Label>
        <MarkdownEditor
          id="composer-body"
          aria-labelledby="composer-body-label"
          value={bodyText}
          onChange={setBodyText}
          toolbarPosition="bottom"
        />
      </div>
      {imageUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="border-border max-h-48 w-full rounded-md border object-cover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setImageUrl(null)}
          >
            <X aria-hidden /> Remove photo
          </Button>
        </div>
      ) : (
        <PhotoDropzone
          label="Photo"
          hint="Drop a photo here, or click browse. You can also paste from the clipboard."
          multiple={false}
          pending={upload.isPending}
          onFiles={(files) => onPickFile(files[0])}
        />
      )}
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Could not publish</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={createPost.isPending || upload.isPending}
      >
        {createPost.isPending ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
