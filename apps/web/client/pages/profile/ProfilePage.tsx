"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { PetCard } from "@client/components/PetCard";
import { AppShell, PageWithSidebar } from "@client/components/layout";
import { Markdown } from "@client/components/markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { useOwnerPets, type PetPublic } from "@client/features/pets";
import { useOwnUser } from "@client/features/users";
import { petHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { publicHandle, userProfileHref } from "@client/lib/userProfilePath";
import { ExternalLink, Eye, Info, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AvatarEditor } from "./AvatarEditor";
import { ConnectedSitesCard } from "./ConnectedSitesCard";
import { PetEditor } from "./PetEditor";
import { PetsEmptyState } from "./PetsEmptyState";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileLinkCard } from "./ProfileLinkCard";
import { ProfileLocationCard } from "./ProfileLocationCard";
import { SocialLinksDialog } from "./SocialLinksDialog";

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const pets = useOwnerPets(user?.id ?? null);
  const [editorPet, setEditorPet] = useState<PetPublic | null | "new">(null);
  const [editOpen, setEditOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  if (loading || !user) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading profile...</main>
      </AppShell>
    );
  }

  const profile = own.data;
  const petList = pets.data ?? [];
  const shareRef = publicHandle(profile ?? user);

  return (
    <AppShell active="profile">
      <main>
        <PageWithSidebar
          sidebar={
            <>
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    <Info aria-hidden className="size-4" />
                    Private editor
                  </CardTitle>
                  <CardDescription>
                    You&apos;re currently on the profile editor page. Only you can
                    see this page. The public page is what everyone else sees.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={userProfileHref(shareRef)}
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
              <ProfileLinkCard
                handleOrId={shareRef}
                hasHandle={Boolean(profile?.handle)}
              />
            </>
          }
        >
            {/* Just picture, name, and bio; location and connected sites are below. */}
            <header className="flex items-start gap-4">
              {profile ? <AvatarEditor user={profile} /> : null}
              <div className="min-w-0 flex-1 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {profile?.displayName || "Add your name"}
                  </h1>
                  {profile ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit name and bio"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  ) : null}
                </div>
                {profile?.handle ? (
                  <p className="text-muted-foreground font-mono text-sm">
                    @{profile.handle}
                  </p>
                ) : profile ? (
                  <p className="text-muted-foreground text-sm">
                    No handle yet — public links use your id until you pick one.
                  </p>
                ) : null}
                {profile?.bio ? (
                  <Markdown className="text-muted-foreground [&_p]:mb-0 text-sm leading-snug [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline">
                    {profile.bio}
                  </Markdown>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Add a bio to tell people about your fostering.
                  </p>
                )}
              </div>
            </header>

            <Separator />

            {own.isError ? (
              <p className="text-destructive text-sm">
                {own.error instanceof Error
                  ? own.error.message
                  : "Unable to load profile from API."}
              </p>
            ) : null}

            {profile ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileLocationCard user={profile} />
                <ConnectedSitesCard user={profile} onManage={() => setSocialOpen(true)} />
              </div>
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
              <ul className="grid gap-3 sm:grid-cols-2">
                {petList.map((pet) => (
                  <li key={pet.id}>
                    {editorPet !== null &&
                    editorPet !== "new" &&
                    editorPet.id === pet.id ? (
                      <PetEditor pet={pet} onClose={() => setEditorPet(null)} />
                    ) : (
                      <PetCard
                        pet={pet}
                        actions={
                          <>
                            <Link
                              href={petHref(shareRef, pet.id)}
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
                          </>
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
        </PageWithSidebar>
      </main>
      {profile ? (
        <>
          <ProfileEditDialog user={profile} open={editOpen} onOpenChange={setEditOpen} />
          <SocialLinksDialog
            user={profile}
            open={socialOpen}
            onOpenChange={setSocialOpen}
          />
        </>
      ) : null}
    </AppShell>
  );
}
