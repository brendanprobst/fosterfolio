"use client";

import { useAuth } from "@client/auth";
import { FeatureUnavailable } from "@client/components/FeatureUnavailable";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { Button, buttonVariants } from "@client/components/ui/button";
import { PostCard, PostComposer, useFeed } from "@client/features/posts";
import { isFosterfolioFeedEnabled } from "@client/lib/fosterfolioFeatureFlags";
import { cn } from "@client/lib/utils";
import Link from "next/link";

export function FeedPage() {
  if (!isFosterfolioFeedEnabled()) {
    return (
      <AppShell active="feed">
        <FeatureUnavailable title="Feed" />
      </AppShell>
    );
  }

  return <FeedPageInner />;
}

function FeedPageInner() {
  const { user, loading } = useAuth();
  const feed = useFeed();
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const signedIn = !!user && !loading;

  return (
    <AppShell active="feed">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Feed</h1>
          <p className="text-muted-foreground text-sm">
            Chronological updates from fosters. Newest first.
          </p>
        </header>

        {signedIn ? (
          <PostComposer />
        ) : (
          <p className="text-muted-foreground text-sm">
            <Link
              href="/auth/sign-in?next=%2Ffeed"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign in to post
            </Link>
          </p>
        )}

        {feed.isLoading ? (
          <DataPageSkeleton embedded variant="list" label="Loading feed" />
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
