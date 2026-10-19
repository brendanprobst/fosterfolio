"use client";

import { QrDownloadMenu, QrThumbnail } from "@client/components/qr";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import type { TrackedLinkItem } from "@client/features/petInsights/types";
import { absoluteUrl } from "@client/lib/absoluteUrl";
import { fosterMeLinkHref } from "@client/lib/userProfilePath";
import { cn } from "@client/lib/utils";
import { CopyLinkButton } from "@client/pages/pets/CopyLinkButton";
import { Archive, ArchiveRestore } from "lucide-react";
import type { ReactNode } from "react";
import { isDefaultLink, ZERO_STATS, type GroupedLinks, type LinkStats } from "./ownerLinks";

type LinkListProps = {
  groups: GroupedLinks;
  stats: Map<string | null, LinkStats>;
  ownerRef: string;
  rangeLabel: string;
  /** Freshly created link id; its row highlights briefly. */
  highlightId: string | null;
  onArchive: (link: TrackedLinkItem, archived: boolean) => void;
};

export function LinkList({ groups, stats, ownerRef, rangeLabel, highlightId, onArchive }: LinkListProps) {
  const statsFor = (id: string | null) => stats.get(id) ?? ZERO_STATS;
  const [first, ...rest] = groups.active;
  const pinned = first && isDefaultLink(first) ? first : null;
  const others = pinned ? rest : groups.active;

  return (
    <div className="space-y-8">
      <section aria-labelledby="your-links-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="your-links-heading" className="text-lg font-semibold tracking-tight">
            Your links
          </h2>
          <p className="text-muted-foreground text-xs">{rangeLabel}</p>
        </div>
        <ul className="space-y-3">
          {pinned ? (
            <li>
              <LinkRow
                link={pinned}
                ownerRef={ownerRef}
                stats={statsFor(pinned.id)}
                highlighted={highlightId === pinned.id}
                onArchive={() => onArchive(pinned, true)}
              />
            </li>
          ) : null}
          <li>
            <UntaggedRow stats={statsFor(null)} />
          </li>
          {others.map((link) => (
            <li key={link.id}>
              <LinkRow
                link={link}
                ownerRef={ownerRef}
                stats={statsFor(link.id)}
                highlighted={highlightId === link.id}
                onArchive={() => onArchive(link, true)}
              />
            </li>
          ))}
        </ul>
      </section>

      {groups.archived.length > 0 ? (
        <Collapsible title={`Archived links (${groups.archived.length})`}>
          <ul className="space-y-3">
            {groups.archived.map((link) => (
              <li key={link.id}>
                <LinkRow
                  link={link}
                  ownerRef={ownerRef}
                  stats={statsFor(link.id)}
                  highlighted={false}
                  archived
                  onArchive={() => onArchive(link, false)}
                />
              </li>
            ))}
          </ul>
        </Collapsible>
      ) : null}

      {groups.legacy.length > 0 ? (
        <Collapsible title={`Older pet-specific links (${groups.legacy.length})`}>
          <p className="text-muted-foreground mb-3 text-sm">
            These still work: each one opens its pet&apos;s page. New links open your foster-me page.
          </p>
          <ul className="space-y-3">
            {groups.legacy.map((link) => (
              <li key={link.id}>
                <LegacyRow link={link} onArchive={() => onArchive(link, !link.archivedAt)} />
              </li>
            ))}
          </ul>
        </Collapsible>
      ) : null}
    </div>
  );
}

function LinkRow({
  link,
  ownerRef,
  stats,
  highlighted,
  archived = false,
  onArchive,
}: {
  link: TrackedLinkItem;
  ownerRef: string;
  stats: LinkStats;
  highlighted: boolean;
  archived?: boolean;
  onArchive: () => void;
}) {
  const path = fosterMeLinkHref(ownerRef, link.code);
  const title = link.label || link.channelName;
  return (
    <article
      aria-label={title}
      data-highlighted={highlighted || undefined}
      className={cn(
        "border-border bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors duration-700",
        highlighted && "border-primary bg-primary/5 ring-primary/30 ring-2",
      )}
    >
      <QrThumbnail url={absoluteUrl(path)} alt={`QR code for ${title}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{title}</span>
          {isDefaultLink(link) ? <Badge variant="secondary">Default</Badge> : null}
        </p>
        {link.label && !isDefaultLink(link) ? (
          <p className="text-muted-foreground text-sm">{link.channelName}</p>
        ) : null}
        <StatLine stats={stats} />
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {archived ? null : (
          <>
            <QrDownloadMenu url={absoluteUrl(path)} filenameBase={title} triggerLabel="QR code" />
            <CopyLinkButton path={path} size="sm" />
          </>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onArchive}>
          {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {archived ? "Unarchive" : "Archive"}
        </Button>
      </div>
    </article>
  );
}

function UntaggedRow({ stats }: { stats: LinkStats }) {
  return (
    <article
      aria-label="Untagged visits"
      className="border-border flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-4"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">Untagged visits</p>
        <p className="text-muted-foreground text-sm">
          People who opened your plain foster-me URL: typed, shared, or from an older sign.
        </p>
        <StatLine stats={stats} />
      </div>
    </article>
  );
}

function LegacyRow({ link, onArchive }: { link: TrackedLinkItem; onArchive: () => void }) {
  const title = link.label || link.channelName;
  return (
    <article
      aria-label={title}
      className="border-border flex flex-wrap items-center gap-3 rounded-xl border p-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">
          {[link.label ? link.channelName : null, link.petName].filter(Boolean).join(" · ") ||
            "Pet link"}
          {link.archivedAt ? " · Archived" : ""}
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onArchive}>
        {link.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {link.archivedAt ? "Unarchive" : "Archive"}
      </Button>
    </article>
  );
}

function StatLine({ stats }: { stats: LinkStats }) {
  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      <span className="text-foreground font-medium">{stats.previewViews}</span>{" "}
      {stats.previewViews === 1 ? "preview view" : "preview views"} ·{" "}
      <span className="text-foreground font-medium">{stats.petTaps}</span>{" "}
      {stats.petTaps === 1 ? "pet tap" : "pet taps"} ·{" "}
      <span className="text-foreground font-medium">{stats.inquiries}</span>{" "}
      {stats.inquiries === 1 ? "inquiry" : "inquiries"}
    </p>
  );
}

function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="border-border group rounded-xl border px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
