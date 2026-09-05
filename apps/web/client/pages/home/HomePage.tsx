"use client";

import { useAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import { Button, buttonVariants } from "@client/components/ui/button";
import { PostCard, useFeed } from "@client/features/posts";
import { cn } from "@client/lib/utils";
import { FeedComposer } from "./FeedComposer";
import Link from "next/link";

export function HomePage() {
  const { user, loading } = useAuth();
  const feed = useFeed();
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const signedIn = !!user && !loading;

  return (
    <AppShell active="home">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Feed</h1>
          <p className="text-muted-foreground text-sm">
            Chronological updates from fosters. Newest first.
          </p>
        </header>

        {signedIn ? <FeedComposer /> : (
          <p className="text-muted-foreground text-sm">
            <Link
              href="/auth/sign-in?next=%2F"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign in to post
            </Link>
          </p>
        )}

        {feed.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading feed…</p>
        ) : null}
        {feed.isError ? (
          <p className="text-destructive text-sm">
            {feed.error instanceof Error
              ? feed.error.message
              : "Failed to load the feed."}
          </p>
        ) : null}
        {!feed.isLoading && posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No posts yet. Be the first to share an update.
          </p>
        ) : null}
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        {feed.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </main>
    </AppShell>
  );
}
