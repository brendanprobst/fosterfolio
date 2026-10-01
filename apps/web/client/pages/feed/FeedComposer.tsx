"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useOwnerPets } from "@client/features/pets";
import { useCreatePostMutation } from "@client/features/posts";
import { useMediaUpload } from "@client/features/storage";
import type { PostType } from "@client/features/posts";
import { FormEvent, useState } from "react";

export function FeedComposer() {
  const { user } = useAuth();
  const petsQuery = useOwnerPets(user?.id ?? null);
  const createPost = useCreatePostMutation();
  const upload = useMediaUpload();
  const [postType, setPostType] = useState<PostType>("general");
  const [petId, setPetId] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const pets = petsQuery.data ?? [];
  const errorMessage =
    createPost.error instanceof Error
      ? createPost.error.message
      : upload.error instanceof Error
        ? upload.error.message
        : null;

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    const result = await upload.mutateAsync(file);
    setImageUrl(result.publicUrl);
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
        },
      },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-border space-y-3 rounded-xl border p-4"
      aria-label="Compose post"
    >
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
      {postType === "pet_update" ? (
        <div className="space-y-1.5">
          <Label htmlFor="composer-pet">Pet</Label>
          <select
            id="composer-pet"
            className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
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
        <Label htmlFor="composer-body">What&apos;s happening?</Label>
        <Textarea
          id="composer-body"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor="composer-photo"
          className="text-muted-foreground cursor-pointer text-sm font-normal"
        >
          {upload.isPending ? "Uploading…" : imageUrl ? "Replace photo" : "Add photo"}
        </Label>
        <input
          id="composer-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
        />
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="border-border max-h-48 w-full rounded-md border object-cover"
        />
      ) : null}
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Could not publish</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        disabled={createPost.isPending || upload.isPending}
      >
        {createPost.isPending ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
