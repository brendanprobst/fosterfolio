"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  PET_SPECIES,
  PET_STATUSES,
  type PetPublic,
  type PetWritePayload,
  useCreatePetMutation,
  useDeletePetMutation,
  useUpdatePetMutation,
} from "@client/features/pets";
import { useMediaUpload } from "@client/features/storage";
import { humanizeToken } from "@client/lib/humanizeToken";
import { cn } from "@client/lib/utils";
import { FormEvent, useState } from "react";

type PetEditorProps = {
  pet: PetPublic | null;
  onClose: () => void;
};

export function PetEditor({ pet, onClose }: PetEditorProps) {
  const createPet = useCreatePetMutation();
  const updatePet = useUpdatePetMutation();
  const deletePet = useDeletePetMutation();
  const upload = useMediaUpload();
  const [name, setName] = useState(pet?.name ?? "");
  const [species, setSpecies] = useState(pet?.species ?? "dog");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [status, setStatus] = useState(pet?.status ?? "actively_fostering");
  const [ageValue, setAgeValue] = useState(
    pet?.ageValue != null ? String(pet.ageValue) : "",
  );
  const [ageUnit, setAgeUnit] = useState(pet?.ageUnit ?? "years");
  const [sex, setSex] = useState(pet?.sex ?? "");
  const [size, setSize] = useState(pet?.size ?? "");
  const [bioMarkdown, setBioMarkdown] = useState(pet?.bioMarkdown ?? "");
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState(
    pet?.primaryPhotoUrl ?? "",
  );
  const [shelterLinkName, setShelterLinkName] = useState(
    pet?.shelterLinkName ?? "",
  );
  const [shelterLinkUrl, setShelterLinkUrl] = useState(pet?.shelterLinkUrl ?? "");

  const pending =
    createPet.isPending || updatePet.isPending || deletePet.isPending || upload.isPending;
  const error =
    createPet.error ?? updatePet.error ?? deletePet.error ?? upload.error;

  function payload(): PetWritePayload {
    const ageNumber = ageValue.trim() ? Number.parseInt(ageValue, 10) : null;
    return {
      name,
      species,
      breed: breed.trim() || null,
      status,
      ageValue: Number.isFinite(ageNumber) ? ageNumber : null,
      ageUnit: ageValue.trim() ? ageUnit : null,
      sex: sex.trim() || null,
      size: size.trim() || null,
      bioMarkdown: bioMarkdown.trim() || null,
      primaryPhotoUrl: primaryPhotoUrl.trim() || null,
      shelterLinkName: shelterLinkName.trim() || null,
      shelterLinkUrl: shelterLinkUrl.trim() || null,
    };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pet) {
      updatePet.mutate({ id: pet.id, payload: payload() }, { onSuccess: onClose });
      return;
    }
    createPet.mutate(payload(), { onSuccess: onClose });
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    const result = await upload.mutateAsync(file);
    setPrimaryPhotoUrl(result.publicUrl);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      aria-label={pet ? `Edit ${pet.name}` : "Add pet"}
    >
      {error instanceof Error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save pet</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="pet-name">Name</Label>
        <Input
          id="pet-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pet-species">Species</Label>
          <select
            id="pet-species"
            className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm capitalize"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            {PET_SPECIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-status">Status</Label>
          <select
            id="pet-status"
            className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {PET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanizeToken(value)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pet-breed">Breed</Label>
        <Input id="pet-breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pet-age">Age</Label>
          <Input
            id="pet-age"
            inputMode="numeric"
            value={ageValue}
            onChange={(e) => setAgeValue(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-age-unit">Age unit</Label>
          <select
            id="pet-age-unit"
            className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
            value={ageUnit}
            onChange={(e) => setAgeUnit(e.target.value)}
          >
            <option value="years">years</option>
            <option value="months">months</option>
            <option value="weeks">weeks</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pet-sex">Sex</Label>
          <Input id="pet-sex" value={sex} onChange={(e) => setSex(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-size">Size</Label>
          <Input id="pet-size" value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pet-bio">Bio (markdown)</Label>
        <Textarea
          id="pet-bio"
          value={bioMarkdown}
          onChange={(e) => setBioMarkdown(e.target.value)}
          rows={6}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pet-photo">Primary photo</Label>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="pet-photo-file"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}
          >
            {upload.isPending ? "Uploading…" : "Upload photo"}
          </label>
          <input
            id="pet-photo-file"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
        </div>
        {primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryPhotoUrl}
            alt=""
            className="border-border max-h-40 rounded-md border object-cover"
          />
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pet-shelter-name">Shelter name</Label>
          <Input
            id="pet-shelter-name"
            value={shelterLinkName}
            onChange={(e) => setShelterLinkName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-shelter-url">Shelter URL</Label>
          <Input
            id="pet-shelter-url"
            value={shelterLinkUrl}
            onChange={(e) => setShelterLinkUrl(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pet ? "Save pet" : "Create pet"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        {pet ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Remove ${pet.name} from Fosterfolio?`)) {
                deletePet.mutate(pet.id, { onSuccess: onClose });
              }
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
