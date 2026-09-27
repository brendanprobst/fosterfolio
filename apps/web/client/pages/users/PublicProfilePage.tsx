"use client";

import { UserAvatar } from "@client/components/UserAvatar";
import { AppShell } from "@client/components/layout";
import { Markdown } from "@client/components/markdown";
import { InquiryForm } from "@client/features/inquiries";
import { useOwnerPets } from "@client/features/pets";
import { PostCard, useAuthorPosts } from "@client/features/posts";
import { StarButton } from "@client/features/stars";
import { useUser } from "@client/features/users";
import { humanizeToken } from "@client/lib/humanizeToken";
import { petHref } from "@client/lib/petBioPath";
import {
  fosterMeHref,
  handleFromPathname,
  publicHandle,
} from "@client/lib/userProfilePath";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PublicProfilePage() {
  const pathname = usePathname();
  const userId = handleFromPathname(pathname);
  const userQuery = useUser(userId);
  const petsQuery = useOwnerPets(userId);
  const postsQuery = useAuthorPosts(userId);
  const user = userQuery.data;

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
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        {!userId ? (
          <p className="text-muted-foreground text-sm">Profile not found.</p>
        ) : null}
        {userId && userQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading profile…</p>
        ) : null}
        {userId && userQuery.isError ? (
          <p className="text-destructive text-sm">
            {userQuery.error instanceof Error
              ? userQuery.error.message
              : "Failed to load profile."}
          </p>
        ) : null}
        {user ? (
          <>
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
                <p>
                  <Link
                    href={fosterMeHref(publicHandle(user))}
                    className="text-primary text-sm hover:underline"
                  >
                    See who they’re fostering now
                  </Link>
                </p>
              </div>
            </header>
            {user.bio ? <Markdown>{user.bio}</Markdown> : null}
            {user.sheltersText ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Shelters: </span>
                {user.sheltersText}
              </p>
            ) : null}
            {user.socialLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-3 text-sm">
                {user.socialLinks.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <a
                      href={link.url}
                      className="text-primary hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            <section className="space-y-3" aria-label="Fostered pets">
              <h2 className="text-lg font-medium">Pets</h2>
              {(petsQuery.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No pets listed yet.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(petsQuery.data ?? []).map((pet) => (
                    <li key={pet.id}>
                      <Link
                        href={petHref(publicHandle(user), pet.id)}
                        className="border-border hover:bg-muted/40 block overflow-hidden rounded-lg border"
                      >
                        {pet.primaryPhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pet.primaryPhotoUrl}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : null}
                        <span className="block p-3">
                          <span className="block font-medium">{pet.name}</span>
                          <span className="text-muted-foreground text-sm capitalize">
                            {humanizeToken(pet.species)}
                            {pet.status ? ` · ${humanizeToken(pet.status)}` : ""}
                          </span>
                        </span>
                      </Link>
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

            <InquiryForm targetUserId={user.id} heading="Contact this foster" />
          </>
        ) : null}
      </main>
    </AppShell>
  );
}
