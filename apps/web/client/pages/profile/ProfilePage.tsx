"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { PetCard } from "@client/components/PetCard";
import { AppShell, DataPageSkeleton, OwnerPageLayout } from "@client/components/layout";
import { BioPreview } from "@client/components/BioPreview";
import { UserAvatar } from "@client/components/UserAvatar";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useOwnerPets } from "@client/features/pets";
import { useOwnUser } from "@client/features/users";
import { petHref } from "@client/lib/petBioPath";
import { petEditorEditHref, petEditorNewHref } from "@client/lib/petEditorPath";
import { publicHandle } from "@client/lib/userProfilePath";
import { cn } from "@client/lib/utils";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  const active = petList.filter((pet) => pet.status === "actively_fostering");
  const past = petList.filter((pet) => pet.status !== "actively_fostering");
  const shareCard = (
    <ProfileLinkCard handleOrId={shareRef} hasHandle={Boolean(profile?.handle)} />
  );

  function petGrid(items: typeof petList) {
    return (
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {items.map((pet) => (
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
    );
  }

  return (
    <AppShell active="profile">
      <main>
        <OwnerPageLayout
          hero={
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-8">
              <div className="space-y-4">
                <header className="flex items-start gap-4">
                  {profile ? (
                    <section className="w-fit shrink-0" aria-label="Profile picture">
                      <UserAvatar
                        name={profile.displayName}
                        url={profile.avatarUrl}
                        size="lg"
                        className="sm:size-24 sm:text-xl"
                      />
                    </section>
                  ) : null}
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
                          aria-label="Edit profile"
                          onClick={() => setEditOpen(true)}
                        >
                          <Pencil aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                    {profile?.handle ? (
                      <p className="text-muted-foreground font-mono text-sm">@{profile.handle}</p>
                    ) : profile ? (
                      <p className="text-muted-foreground text-sm">
                        No handle yet — public links use a random address until you pick one.
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
                <Link href={petEditorNewHref()} className={cn(buttonVariants({ size: "lg" }))}>
                  <Plus aria-hidden />
                  Add pet
                </Link>
              </div>
            {own.isError ? (
              <p className="text-destructive text-sm">
                {own.error instanceof Error ? own.error.message : "Unable to load profile from API."}
              </p>
            ) : null}
            {profile ? (
              <section className="space-y-3" aria-label="Your details">
                <h2 className="text-lg font-medium">Your details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileLocationCard user={profile} onManage={() => setLocationOpen(true)} />
                  <ConnectedSitesCard user={profile} onManage={() => setSocialOpen(true)} />
                </div>
              </section>
            ) : null}
            <section className="space-y-3" aria-label="Currently fostering">
              <h2 className="text-lg font-medium">Currently fostering</h2>
              {petList.length === 0 ? <PetsEmptyState /> : null}
              {active.length === 0 && past.length > 0 ? (
                <p className="text-muted-foreground text-sm">
                  No current fosters.{" "}
                  <Link href={petEditorNewHref()} className="text-primary hover:underline">
                    Add pet
                  </Link>
                </p>
              ) : null}
              {active.length > 0 ? petGrid(active) : null}
            </section>
              </div>
              <div className="hidden lg:block">{shareCard}</div>
            </div>
          }
        />
        <div className="mx-auto max-w-5xl space-y-10 px-4 pb-16">
          <div className="lg:hidden">{shareCard}</div>
          {past.length > 0 ? (
            <section className="space-y-3" aria-label="Past fosters">
              <h2 className="text-lg font-medium">Past fosters</h2>
              {petGrid(past)}
            </section>
          ) : null}
        </div>
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
