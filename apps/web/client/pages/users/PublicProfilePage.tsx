"use client";

import { useAuth } from "@client/auth";
import { PetCard } from "@client/components/PetCard";
import { UserAvatar } from "@client/components/UserAvatar";
import { AppShell, PageWithSidebar } from "@client/components/layout";
import { Markdown } from "@client/components/markdown";
import { useOwnerPets } from "@client/features/pets";
import { PostCard, useAuthorPosts } from "@client/features/posts";
import { StarButton } from "@client/features/stars";
import { useUser } from "@client/features/users";
import { petHref } from "@client/lib/petBioPath";
import {
  handleFromPathname,
  publicHandle,
} from "@client/lib/userProfilePath";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PublicProfileSidebar } from "./PublicProfileSidebar";

export function PublicProfilePage() {
  const pathname = usePathname();
  const { user: viewer } = useAuth();
  const userId = handleFromPathname(pathname);
  const userQuery = useUser(userId);
  const petsQuery = useOwnerPets(userId);
  const postsQuery = useAuthorPosts(userId);
  const user = userQuery.data;
  const isOwner = Boolean(viewer && user && viewer.id === user.id);
  const shareRef = user ? publicHandle(user) : "";

  useEffect(() => {
    if (user?.displayName) {
      document.title = `${user.displayName} · Fosterfolio`;
      return;
    }
    document.title = "Fosterfolio";
  }, [user?.displayName]);

  const location = user
    ? [user.city, user.state].filter(Boolean).join(", ")
    : "";

  return (
    <AppShell>
      <main>
        {!userId ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Profile not found.
          </p>
        ) : null}
        {userId && userQuery.isLoading ? (
          <p className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">
            Loading profile…
          </p>
        ) : null}
        {userId && userQuery.isError ? (
          <p className="text-destructive mx-auto max-w-5xl px-4 py-8 text-sm">
            {userQuery.error instanceof Error
              ? userQuery.error.message
              : "Failed to load profile."}
          </p>
        ) : null}
        {user ? (
          <PageWithSidebar
            sidebar={
              <PublicProfileSidebar
                handleOrId={shareRef}
                displayName={user.displayName || "this foster"}
                userId={user.id}
                isOwner={isOwner}
              />
            }
          >
            <header className="flex items-start gap-4">
              <UserAvatar name={user.displayName} url={user.avatarUrl} size="lg" />
              <div className="min-w-0 space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {user.displayName || "Foster"}
                </h1>
                {user.handle ? (
                  <p className="text-muted-foreground font-mono text-sm">
                    @{user.handle}
                  </p>
                ) : null}
                {location ? (
                  <p className="text-muted-foreground text-sm">{location}</p>
                ) : null}
                <StarButton userId={user.id} initialCount={user.starCount} />
              </div>
            </header>

            {user.bio ? <Markdown>{user.bio}</Markdown> : null}

            {user.sheltersText || user.socialLinks.length > 0 ? (
              <section className="space-y-3" aria-label="How to find them">
                {user.sheltersText ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Works with </span>
                    {user.sheltersText}
                  </p>
                ) : null}
                {user.socialLinks.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {user.socialLinks.map((link) => (
                      <li key={`${link.label}-${link.url}`}>
                        <a
                          href={link.url}
                          className="border-border hover:bg-muted/40 inline-flex rounded-full border px-3 py-1 text-sm"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <section className="space-y-3" aria-label="Fostered pets">
              <h2 className="text-lg font-medium">Pets</h2>
              {(petsQuery.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No pets listed yet.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(petsQuery.data ?? []).map((pet) => (
                    <li key={pet.id}>
                      <PetCard
                        pet={pet}
                        href={petHref(shareRef, pet.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(postsQuery.data ?? []).length > 0 ? (
              <section className="space-y-3" aria-label="Posts">
                <h2 className="text-lg font-medium">Posts</h2>
                {(postsQuery.data ?? []).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </section>
            ) : null}
          </PageWithSidebar>
        ) : null}
      </main>
    </AppShell>
  );
}
