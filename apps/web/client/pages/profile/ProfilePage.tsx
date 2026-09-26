"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import { Markdown } from "@client/components/markdown";
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
import { humanizeToken } from "@client/lib/humanizeToken";
import { petBioHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { userProfileHref } from "@client/lib/userProfilePath";
import { ExternalLink, Eye, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AvatarEditor } from "./AvatarEditor";
import { PetEditor } from "./PetEditor";
import { PetsEmptyState } from "./PetsEmptyState";
import { ProfileDetails } from "./ProfileDetails";
import { ProfileEditDialog } from "./ProfileEditDialog";

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const pets = useOwnerPets(user?.id ?? null);
  const [editorPet, setEditorPet] = useState<PetPublic | null | "new">(null);
  const [editOpen, setEditOpen] = useState(false);

  if (loading || !user) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading profile...</main>
      </AppShell>
    );
  }

  const profile = own.data;
  const petList = pets.data ?? [];

  return (
    <AppShell active="profile">
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
          <div className="min-w-0 space-y-8">
            <header className="flex flex-wrap items-center gap-4">
              {profile ? <AvatarEditor user={profile} /> : null}
              {/* Location and the rest of the profile live in `ProfileDetails`. */}
              <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">
                {profile?.displayName || "Add your name"}
              </h1>
              {profile ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil aria-hidden />
                  Edit profile
                </Button>
              ) : null}
            </header>

            {own.isError ? (
              <p className="text-destructive text-sm">
                {own.error instanceof Error
                  ? own.error.message
                  : "Unable to load profile from API."}
              </p>
            ) : null}

            {profile?.bio ? (
              <section aria-label="Bio">
                <Markdown>{profile.bio}</Markdown>
              </section>
            ) : null}

            {profile ? (
              <ProfileDetails user={profile} onEdit={() => setEditOpen(true)} />
            ) : null}

            <section className="space-y-3" aria-label="Your pets">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Your pets</h2>
                {petList.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditorPet("new")}
                  >
                    <Plus aria-hidden />
                    Add pet
                  </Button>
                ) : null}
              </div>
              {editorPet === "new" ? (
                <PetEditor pet={null} onClose={() => setEditorPet(null)} />
              ) : null}
              {petList.length === 0 && editorPet !== "new" ? (
                <PetsEmptyState onAddPet={() => setEditorPet("new")} />
              ) : null}
              <ul className="space-y-3">
                {petList.map((pet) => (
                  <li
                    key={pet.id}
                    className="border-border space-y-3 rounded-xl border p-4"
                  >
                    {editorPet !== null &&
                    editorPet !== "new" &&
                    editorPet.id === pet.id ? (
                      <PetEditor pet={pet} onClose={() => setEditorPet(null)} />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{pet.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {humanizeToken(pet.species)}
                            {pet.status ? ` · ${humanizeToken(pet.status)}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={petBioHref(pet.id)}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                            )}
                          >
                            <Eye aria-hidden />
                            View bio
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditorPet(pet)}
                          >
                            <Pencil aria-hidden />
                            Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Private editor</CardTitle>
                <CardDescription>
                  Only you can see this page. The public page is what everyone else
                  sees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={userProfileHref(user.id)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full",
                  )}
                >
                  <ExternalLink aria-hidden />
                  View public profile
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      {profile ? (
        <ProfileEditDialog
          user={profile}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </AppShell>
  );
}
