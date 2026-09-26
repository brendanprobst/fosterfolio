"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useOwnerPets, type PetPublic } from "@client/features/pets";
import { useOwnUser } from "@client/features/users";
import { petBioHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { userProfileHref } from "@client/lib/userProfilePath";
import { AvatarEditor } from "./AvatarEditor";
import { PetEditor } from "./PetEditor";
import { ProfileEditForm } from "./ProfileEditForm";
import Link from "next/link";
import { useState } from "react";

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const pets = useOwnerPets(user?.id ?? null);
  const [editorPet, setEditorPet] = useState<PetPublic | null | "new">(null);

  if (loading || !user) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading profile...</main>
      </AppShell>
    );
  }

  return (
    <AppShell active="profile">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-muted-foreground text-sm">
            This is your private editor. The public page is what others see.
          </p>
          <Link
            href={userProfileHref(user.id)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View public profile
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Authenticated user</CardTitle>
            <CardDescription>
              Email and id are from verified Supabase JWT claims.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Email:</strong> {own.data?.email || user.email || "No email available"}
            </p>
            <p>
              <strong>User ID:</strong> {own.data?.id || user.id || "No id available"}
            </p>
            {own.isError ? (
              <p className="text-destructive">
                {own.error instanceof Error
                  ? own.error.message
                  : "Unable to load profile from API."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {own.data ? <AvatarEditor user={own.data} /> : null}

        {own.data ? <ProfileEditForm user={own.data} /> : null}

        <section className="space-y-3" aria-label="Your pets">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">Your pets</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditorPet("new")}
            >
              Add pet
            </Button>
          </div>
          {editorPet === "new" ? (
            <PetEditor pet={null} onClose={() => setEditorPet(null)} />
          ) : null}
          {(pets.data ?? []).length === 0 && editorPet !== "new" ? (
            <p className="text-muted-foreground text-sm">
              Add a pet to publish a bio page and QR code.
            </p>
          ) : null}
          <ul className="space-y-3">
            {(pets.data ?? []).map((pet) => (
              <li key={pet.id} className="border-border space-y-3 rounded-xl border p-4">
                {editorPet !== null && editorPet !== "new" && editorPet.id === pet.id ? (
                  <PetEditor pet={pet} onClose={() => setEditorPet(null)} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-muted-foreground text-sm capitalize">
                        {pet.species}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={petBioHref(pet.id)}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View bio
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditorPet(pet)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
