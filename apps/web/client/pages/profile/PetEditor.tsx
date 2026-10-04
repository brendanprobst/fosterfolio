"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { Textarea } from "@client/components/ui/textarea";
import {
  MAX_PET_PHOTOS,
  PET_SPECIES,
  PET_STATUSES,
  type PetPhoto,
  type PetPublic,
  type PetWritePayload,
  useCreatePetMutation,
  useDeletePetMutation,
  useUpdatePetMutation,
} from "@client/features/pets";
import { useMediaUpload } from "@client/features/storage";
import { useOwnUser, useUpdateUserMutation } from "@client/features/users";
import { humanizeToken } from "@client/lib/humanizeToken";
import { parseShelterLinks, serializeShelterLinks, type ShelterLink } from "@client/lib/shelterLinks";
import { Check, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { AddPetShelterDialog } from "./AddPetShelterDialog";
import { AgeUnitToggle } from "./AgeUnitToggle";
import { PetPhotoDropzone } from "./PetPhotoDropzone";
import { PetPhotoList } from "./PetPhotoList";
import { PetShelterPicker } from "./PetShelterPicker";
import { SexToggle } from "./SexToggle";

type PetEditorProps = {
  pet: PetPublic | null;
  onClose: () => void;
};

function initialPhotos(pet: PetPublic | null): PetPhoto[] {
  if (pet?.photos?.length) return pet.photos;
  if (pet?.primaryPhotoUrl) return [{ url: pet.primaryPhotoUrl }];
  return [];
}

export function PetEditor({ pet, onClose }: PetEditorProps) {
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const createPet = useCreatePetMutation();
  const updatePet = useUpdatePetMutation();
  const deletePet = useDeletePetMutation();
  const upload = useMediaUpload();
  const updateUser = useUpdateUserMutation();
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
  const [photos, setPhotos] = useState<PetPhoto[]>(() => initialPhotos(pet));
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [shelterLinkName, setShelterLinkName] = useState(
    pet?.shelterLinkName ?? "",
  );
  const [shelterLinkUrl, setShelterLinkUrl] = useState(pet?.shelterLinkUrl ?? "");
  const [manualShelterOpen, setManualShelterOpen] = useState(false);

  const pending =
    createPet.isPending ||
    updatePet.isPending ||
    deletePet.isPending ||
    upload.isPending ||
    updateUser.isPending;
  const error =
    createPet.error ?? updatePet.error ?? deletePet.error ?? upload.error;
  const profileShelters = parseShelterLinks(own.data?.sheltersText);

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
      photos,
      primaryPhotoUrl: photos[0]?.url ?? null,
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

  async function onPickFiles(files: File[]) {
    setPhotoNotice(null);
    let room = MAX_PET_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoNotice(`A pet can have up to ${MAX_PET_PHOTOS} photos.`);
      return;
    }
    const batch = files.slice(0, room);
    if (files.length > room) {
      setPhotoNotice(`A pet can have up to ${MAX_PET_PHOTOS} photos.`);
    }
    for (const file of batch) {
      const result = await upload.mutateAsync(file);
      setPhotos((current) => {
        if (current.length >= MAX_PET_PHOTOS) return current;
        return [...current, { url: result.publicUrl }];
      });
      room -= 1;
    }
  }

  function deletePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  function selectShelter(shelter: ShelterLink | null) {
    setShelterLinkName(shelter?.name ?? "");
    setShelterLinkUrl(shelter?.url ?? "");
  }

  function addShelterToProfile(shelter: ShelterLink) {
    if (!own.data) return;
    const next = [...profileShelters];
    const exists = next.some(
      (row) => row.name === shelter.name && row.url === shelter.url,
    );
    if (!exists) next.push(shelter);
    updateUser.mutate(
      {
        id: own.data.id,
        payload: { sheltersText: serializeShelterLinks(next) },
      },
      {
        onSuccess: () => {
          selectShelter(shelter);
          setManualShelterOpen(false);
        },
      },
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-6"
        aria-label={pet ? `Edit ${pet.name}` : "Add pet"}
      >
        {error instanceof Error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not save pet</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-3">
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
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="pet-age">Age</Label>
              <Input
                id="pet-age"
                inputMode="numeric"
                value={ageValue}
                onChange={(e) => setAgeValue(e.target.value)}
              />
            </div>
            <AgeUnitToggle value={ageUnit} onChange={setAgeUnit} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="pet-weight">Weight</Label>
              <Input
                id="pet-weight"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 28 lb (please include your unit)"
              />
            </div>
            <SexToggle value={sex} onChange={setSex} />
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
        </div>

        <div className="space-y-3">
          {photos.length < MAX_PET_PHOTOS ? (
            <PetPhotoDropzone pending={upload.isPending} onFiles={onPickFiles} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {MAX_PET_PHOTOS} photos is the maximum.
            </p>
          )}
          {photoNotice ? <p className="text-destructive text-sm">{photoNotice}</p> : null}
          <PetPhotoList
            photos={photos}
            pending={upload.isPending}
            onDelete={deletePhoto}
            onMove={movePhoto}
          />
        </div>

        <PetShelterPicker
          shelters={profileShelters}
          selectedName={shelterLinkName}
          selectedUrl={shelterLinkUrl}
          onSelect={selectShelter}
          onAddManually={() => setManualShelterOpen(true)}
        />

        <Separator />

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {pet ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`Remove ${pet.name} from Fosterfolio?`)) {
                    deletePet.mutate(pet.id, { onSuccess: onClose });
                  }
                }}
              >
                <Trash2 aria-hidden />
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              <Check aria-hidden />
              {pet ? "Save pet" : "Create pet"}
            </Button>
          </div>
        </footer>
      </form>
      <AddPetShelterDialog
        open={manualShelterOpen}
        onOpenChange={setManualShelterOpen}
        pending={updateUser.isPending}
        error={updateUser.error instanceof Error ? updateUser.error : null}
        onSave={addShelterToProfile}
      />
    </>
  );
}
