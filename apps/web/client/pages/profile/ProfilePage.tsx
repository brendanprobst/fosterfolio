"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { PetCard } from "@client/components/PetCard";
import { AppShell, DataPageSkeleton, PageWithSidebar } from "@client/components/layout";
import { BioPreview } from "@client/components/BioPreview";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { useOwnerPets } from "@client/features/pets";
import { useOwnUser } from "@client/features/users";
import { petHref } from "@client/lib/petBioPath";
import { petEditorEditHref, petEditorNewHref } from "@client/lib/petEditorPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { cn } from "@client/lib/utils";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AvatarEditor } from "./AvatarEditor";
import { ConnectedSitesCard } from "./ConnectedSitesCard";
import { PetsEmptyState } from "./PetsEmptyState";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileLinkCard } from "./ProfileLinkCard";
import { ProfileLocationCard } from "./ProfileLocationCard";
import { ProfileLocationDialog } from "./ProfileLocationDialog";
import { SocialLinksDialog } from "./SocialLinksDialog";

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const pets = useOwnerPets(user?.id ?? null);
  const [editOpen, setEditOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  if (loading || !user || own.isLoading || pets.isLoading) {
    return (
      <AppShell active="profile">
        <main>
          <DataPageSkeleton variant="profile" label="Loading profile" />
        </main>
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
          mobileSummary={{
            title: "Share your pages",
            description:
              "Preview, copy, or open a QR code for your profile and Foster Me links.",
          }}
          sidebar={
            <ProfileLinkCard
              handleOrId={shareRef}
              hasHandle={Boolean(profile?.handle)}
            />
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
                  <BioPreview
                    bio={profile.bio}
                    markdownClassName="text-muted-foreground [&_p]:mb-0 text-sm leading-snug [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline"
                    onReadMore={() => setEditOpen(true)}
                  />
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
                <ProfileLocationCard
                  user={profile}
                  onManage={() => setLocationOpen(true)}
                />
                <ConnectedSitesCard user={profile} onManage={() => setSocialOpen(true)} />
              </div>
            ) : null}

            <section className="space-y-3" aria-label="Your pets">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Your pets</h2>
                {petList.length > 0 ? (
                  <Link
                    href={petEditorNewHref()}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  >
                    <Plus aria-hidden />
                    Add pet
                  </Link>
                ) : null}
              </div>
              {petList.length === 0 ? <PetsEmptyState /> : null}
              <ul className="grid gap-3 sm:grid-cols-2">
                {petList.map((pet) => (
                  <li key={pet.id}>
                    <PetCard
                      pet={pet}
                      href={petHref(shareRef, pet.id)}
                      actions={
                        <Link
                          href={petEditorEditHref(pet.id)}
                          className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                        >
                          <Pencil aria-hidden />
                          Edit
                        </Link>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
        </PageWithSidebar>
      </main>
      {profile ? (
        <>
          <ProfileEditDialog user={profile} open={editOpen} onOpenChange={setEditOpen} />
          <ProfileLocationDialog
            user={profile}
            open={locationOpen}
            onOpenChange={setLocationOpen}
          />
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
