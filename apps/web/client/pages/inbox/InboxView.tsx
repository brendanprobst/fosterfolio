"use client";

import {
  InboxDetailHeader,
  InboxFilters,
  InboxLayout,
  InboxList,
} from "@client/components/inbox";
import { Button, buttonVariants } from "@client/components/ui/button";
import type { InboxItem } from "@client/features/notifications/types";
import { channelDisplayName } from "@client/features/petInsights/present";
import type { ChannelOption } from "@client/features/petInsights/types";
import { petHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { toInboxEntry } from "./inquiryEntry";

export type InboxFilter = "unread" | "all" | "archived";

type InboxViewProps = {
  status: InboxFilter;
  onStatus: (status: InboxFilter) => void;
  items: InboxItem[];
  channels: ChannelOption[];
  ownerRef: string;
  selectedId: string | null;
  unreadCount: number;
  listDimmed?: boolean;
  onOpen: (item: InboxItem) => void;
  onBack: () => void;
  onArchive: (item: InboxItem, archived: boolean) => void;
  onMarkUnread: (item: InboxItem) => void;
};

const emptyCopy: Record<InboxFilter, { title: string; body: string }> = {
  unread: {
    title: "You're all caught up.",
    body: "New inquiries land here and in your email.",
  },
  all: {
    title: "No inquiries yet.",
    body: "Share your pet's link or QR code to get the word out.",
  },
  archived: {
    title: "Nothing archived.",
    body: "Archive an inquiry once you've handled it.",
  },
};

export function InboxView({
  status,
  onStatus,
  items,
  channels,
  ownerRef,
  selectedId,
  unreadCount,
  listDimmed = false,
  onOpen,
  onBack,
  onArchive,
  onMarkUnread,
}: InboxViewProps) {
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const copy = emptyCopy[status];

  return (
    <InboxLayout
      hasSelection={selected != null}
      onBack={onBack}
      filters={
        <InboxFilters
          value={status}
          onChange={onStatus}
          options={[
            { value: "unread", label: "Unread", count: unreadCount },
            { value: "all", label: "All" },
            { value: "archived", label: "Archived" },
          ]}
        />
      }
      list={
        <div className={cn(listDimmed && "opacity-60")}>
          <InboxList
            entries={items.map(toInboxEntry)}
            selectedId={selectedId}
            onSelect={(id) => {
              const item = items.find((entry) => entry.id === id);
              if (item) onOpen(item);
            }}
            empty={
              <div className="text-muted-foreground px-2 py-6 text-sm">
                <p className="text-foreground font-medium">{copy.title}</p>
                <p>{copy.body}</p>
              </div>
            }
          />
        </div>
      }
      detail={
        selected ? (
          <InquiryDetail
            item={selected}
            channels={channels}
            ownerRef={ownerRef}
            onArchive={onArchive}
            onMarkUnread={onMarkUnread}
          />
        ) : (
          <div className="text-muted-foreground flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm">
            <Inbox aria-hidden className="size-8" />
            <p>Select an inquiry to read it.</p>
          </div>
        )
      }
    />
  );
}

/** Inquiry viewer. Archive / mark-unread buttons render only when their handler is passed. */
export function InquiryDetail({
  item,
  channels,
  ownerRef,
  onArchive,
  onMarkUnread,
}: {
  item: InboxItem;
  channels: ChannelOption[];
  ownerRef: string;
  onArchive?: (item: InboxItem, archived: boolean) => void;
  onMarkUnread?: (item: InboxItem) => void;
}) {
  const payload = item.payload;
  const email = text(payload.senderEmail);
  const name = text(payload.senderName) || "Someone";
  const archived = item.archivedAt != null;
  const petName = text(item.pet?.name);
  const subject = encodeURIComponent(petName ? `Re: ${petName}` : "Re: your inquiry");

  return (
    <article className="space-y-4">
      <InboxDetailHeader
        title={name}
        receivedAt={item.createdAt}
        subtitle={
          email ? (
            <a className="text-foreground underline" href={mailtoHref(email)}>
              {email}
            </a>
          ) : (
            "No email given"
          )
        }
        actions={
          <>
            {email ? (
              <a
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                href={`${mailtoHref(email)}?subject=${subject}`}
              >
                Reply by email
              </a>
            ) : null}
            {onArchive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onArchive(item, !archived)}
              >
                {archived ? "Move to inbox" : "Archive"}
              </Button>
            ) : null}
            {onMarkUnread && item.readAt && !archived ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onMarkUnread(item)}>
                Mark as unread
              </Button>
            ) : null}
          </>
        }
      />
      <InquiryDetailBody item={item} channels={channels} ownerRef={ownerRef} />
    </article>
  );
}

function InquiryDetailBody({
  item,
  channels,
  ownerRef,
}: {
  item: InboxItem;
  channels: ChannelOption[];
  ownerRef: string;
}) {
  const payload = item.payload;
  const zip = text(payload.zip);
  const channelKey = text(payload.sourceChannelKey);
  const label = text(payload.linkLabel);
  const selfReported = text(payload.selfReportedSource);
  const source =
    !channelKey || channelKey === "direct"
      ? selfReported || "Direct / original QR"
      : label
        ? `via ${channelDisplayName(channelKey, channels)} — ${label}`
        : `via ${channelDisplayName(channelKey, channels)}`;
  const petId = text(payload.petId);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text(payload.message)}</p>
      <div className="flex flex-wrap gap-2">
        {item.pet?.unavailable || !petId ? (
          <p className="border-border inline-flex rounded-full border px-2 py-0.5 text-xs">
            No longer available
          </p>
        ) : (
          <Link
            href={petHref(ownerRef, petId)}
            className="border-border inline-flex rounded-full border px-2 py-0.5 text-xs"
          >
            {item.pet?.name || "Pet"}
          </Link>
        )}
        <p className="border-border inline-flex rounded-full border px-2 py-0.5 text-xs">{source}</p>
        {zip ? (
          <p className="border-border inline-flex rounded-full border px-2 py-0.5 text-xs">Near {zip}</p>
        ) : null}
      </div>
    </div>
  );
}

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/** Percent-encodes each side of the `@` so a stored `?`, `&` or `,` can't add mailto headers. */
function mailtoHref(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return `mailto:${encodeURIComponent(email)}`;
  const local = encodeURIComponent(email.slice(0, at));
  return `mailto:${local}@${encodeURIComponent(email.slice(at + 1))}`;
}
