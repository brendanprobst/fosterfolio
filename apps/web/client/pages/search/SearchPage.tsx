"use client";

import { AppShell } from "@client/components/layout";
import { UserAvatar } from "@client/components/UserAvatar";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { useSearch } from "@client/features/search";
import { humanizeToken } from "@client/lib/humanizeToken";
import { petBioHref } from "@client/lib/petBioPath";
import { userProfileHref } from "@client/lib/userProfilePath";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [draft, setDraft] = useState(initialQ);
  const query = initialQ.trim();
  const search = useSearch(query);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    router.replace(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  }

  const pets = search.data?.pets ?? [];
  const users = search.data?.users ?? [];

  return (
    <AppShell active="search">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
          <p className="text-muted-foreground text-sm">
            Find pets and fosters by name.
          </p>
        </header>
        <form onSubmit={onSubmit} className="flex items-end gap-2" role="search">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="search-q">Name</Label>
            <Input
              id="search-q"
              name="q"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search pets and people"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        {!query ? (
          <p className="text-muted-foreground text-sm">
            Type a name to search.
          </p>
        ) : null}
        {query && search.isLoading ? (
          <p className="text-muted-foreground text-sm">Searching…</p>
        ) : null}
        {query && search.isError ? (
          <p className="text-destructive text-sm">
            {search.error instanceof Error
              ? search.error.message
              : "Search failed."}
          </p>
        ) : null}
        {query && search.isSuccess && pets.length === 0 && users.length === 0 ? (
          <p className="text-muted-foreground text-sm">No matches for “{query}”.</p>
        ) : null}
        {pets.length > 0 ? (
          <section className="space-y-3" aria-label="Pets">
            <h2 className="text-lg font-medium">Pets</h2>
            <ul className="space-y-3">
              {pets.map((pet) => (
                <li key={pet.id}>
                  <Link
                    href={petBioHref(pet.id)}
                    className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-1"
                  >
                    {pet.primaryPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pet.primaryPhotoUrl}
                        alt=""
                        className="border-border size-12 rounded-md border object-cover"
                      />
                    ) : (
                      <span className="bg-muted size-12 rounded-md" />
                    )}
                    <span>
                      <span className="block font-medium">{pet.name}</span>
                      <span className="text-muted-foreground text-sm capitalize">
                        {humanizeToken(pet.species)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {users.length > 0 ? (
          <section className="space-y-3" aria-label="Fosters">
            <h2 className="text-lg font-medium">Fosters</h2>
            <ul className="space-y-3">
              {users.map((user) => (
                <li key={user.id}>
                  <Link
                    href={userProfileHref(user.id)}
                    className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-1"
                  >
                    <UserAvatar
                      name={user.displayName}
                      url={user.avatarUrl}
                      size="sm"
                    />
                    <span>
                      <span className="block font-medium">
                        {user.displayName || "Foster"}
                      </span>
                      {user.city || user.state ? (
                        <span className="text-muted-foreground text-sm">
                          {[user.city, user.state].filter(Boolean).join(", ")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

export function SearchPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="search">
          <main className="mx-auto max-w-2xl px-4 py-8">
            <p className="text-muted-foreground text-sm">Loading search…</p>
          </main>
        </AppShell>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
