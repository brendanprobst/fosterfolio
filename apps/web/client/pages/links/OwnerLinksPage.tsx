"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton, OwnerPageLayout } from "@client/components/layout";
import { useOwnUser } from "@client/features/users";
import {
  archiveTrackedLink,
  createOwnerLink,
  fetchChannels,
  fetchOwnerLinkAnalytics,
  fetchOwnerLinks,
} from "@client/features/petInsights/petInsightsApi";
import type { OwnerLinkAnalytics, TrackedLinkItem } from "@client/features/petInsights/types";
import { publicHandle } from "@client/lib/userProfilePath";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CreateLinkDialog, type CreateLinkInput } from "./CreateLinkDialog";
import { FirstLinkIntroDialog } from "./FirstLinkIntroDialog";
import { LinkList } from "./LinkList";
import { LinksHero } from "./LinksHero";
import {
  groupOwnerLinks,
  LINK_RANGES,
  RANGE_LABELS,
  statsByLink,
  type LinkRange,
} from "./ownerLinks";

const LINKS_KEY = ["owner-links"] as const;
const HIGHLIGHT_MS = 2500;

export function OwnerLinksPage() {
  const { loading } = useRequireAuth();
  const { user, getAccessToken } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const queryClient = useQueryClient();
  const [range, setRange] = useState<LinkRange>("30d");
  const [createOpen, setCreateOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const signedIn = Boolean(user);

  const links = useQuery({
    queryKey: LINKS_KEY,
    enabled: signedIn,
    queryFn: async () => fetchOwnerLinks((await getAccessToken()) ?? ""),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    enabled: signedIn,
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });
  // All three ranges up front so switching the range never shows a spinner.
  const analytics = useQueries({
    queries: LINK_RANGES.map((value) => ({
      queryKey: ["owner-link-analytics", value] as const,
      enabled: signedIn,
      staleTime: 60_000,
      queryFn: async () => fetchOwnerLinkAnalytics((await getAccessToken()) ?? "", value),
    })),
    combine: (results) => ({
      byRange: Object.fromEntries(
        LINK_RANGES.map((value, index) => [value, results[index]?.data]),
      ) as Record<LinkRange, OwnerLinkAnalytics | undefined>,
      isLoading: results.some((query) => query.isLoading),
    }),
  });

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  function addLink(link: TrackedLinkItem) {
    queryClient.setQueryData<TrackedLinkItem[]>(LINKS_KEY, (prev) => [...(prev ?? []), link]);
    setHighlightId(link.id);
    void queryClient.invalidateQueries({ queryKey: LINKS_KEY });
  }

  const createFirst = useMutation({
    mutationFn: async () => createOwnerLink((await getAccessToken()) ?? "", { isDefault: true }),
    onSuccess: addLink,
    onError: (err) => {
      // The intro says the link is ready, so it must not stay open over a failure.
      setIntroOpen(false);
      setActionError(err instanceof Error ? err.message : "Failed to create your first link.");
      void queryClient.invalidateQueries({ queryKey: LINKS_KEY });
    },
  });
  const create = useMutation({
    mutationFn: async (input: CreateLinkInput) =>
      createOwnerLink((await getAccessToken()) ?? "", input),
    onSuccess: (link) => {
      addLink(link);
      void queryClient.invalidateQueries({ queryKey: ["me-channels"] });
    },
  });
  const archive = useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) =>
      archiveTrackedLink((await getAccessToken()) ?? "", input.id, input.archived),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LINKS_KEY }),
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Failed to update that link."),
  });

  const groups = useMemo(() => groupOwnerLinks(links.data ?? []), [links.data]);
  const stats = useMemo(() => statsByLink(analytics.byRange[range]), [analytics.byRange, range]);
  const firstRun = groups.active.length === 0;

  if (loading || !user || own.isLoading || links.isLoading) {
    return (
      <AppShell active="links">
        <main>
          <DataPageSkeleton variant="analytics" label="Loading links" />
        </main>
      </AppShell>
    );
  }

  const ownerRef = publicHandle(own.data ?? user);

  return (
    <AppShell active="links">
      <main>
        <OwnerPageLayout
          hero={
            <LinksHero
              analytics={analytics.byRange[range]}
              loading={analytics.isLoading}
              range={range}
              onRangeChange={setRange}
              pulse={firstRun}
              onCreate={() => setCreateOpen(true)}
            />
          }
        />
        <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16">
          {links.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {links.error instanceof Error ? links.error.message : "Failed to load links."}
            </p>
          ) : null}
          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}
          {firstRun && !createFirst.isPending ? (
            <section
              aria-label="No links yet"
              className="border-border space-y-2 rounded-xl border border-dashed p-6 text-center"
            >
              <h2 className="text-lg font-semibold tracking-tight">No links yet</h2>
              <p className="text-muted-foreground mx-auto max-w-prose text-sm">
                A link is a tagged version of your foster-me URL. Put one on your lawn sign, another
                on Instagram, and see which one brings adopters to your pets.
              </p>
            </section>
          ) : null}
          <LinkList
            groups={groups}
            stats={stats}
            ownerRef={ownerRef}
            rangeLabel={RANGE_LABELS[range]}
            highlightId={highlightId}
            onArchive={(link, archived) => {
              setActionError(null);
              archive.mutate({ id: link.id, archived });
            }}
          />
        </div>
        <CreateLinkDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          channels={channels.data ?? []}
          firstRun={firstRun}
          onCreateFirst={() => {
            setActionError(null);
            setCreateOpen(false);
            setIntroOpen(true);
            createFirst.mutate();
          }}
          onCreate={async (input) => {
            setActionError(null);
            await create.mutateAsync(input);
          }}
        />
        <FirstLinkIntroDialog open={introOpen} onOpenChange={setIntroOpen} />
      </main>
    </AppShell>
  );
}
