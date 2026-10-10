"use client";

import type { InboxItem } from "@client/features/notifications/types";
import { channelDisplayName } from "@client/features/petInsights/present";
import type { ChannelOption } from "@client/features/petInsights/types";
import { petHref } from "@client/lib/petBioPath";
import { cn } from "@client/lib/utils";
import Link from "next/link";

export type InboxFilter = "unread" | "all" | "archived";

type InboxViewProps = {
  status: InboxFilter;
  onStatus: (status: InboxFilter) => void;
  items: InboxItem[];
  channels: ChannelOption[];
  ownerRef: string;
  selectedId: string | null;
  onSelect: (item: InboxItem) => void;
};

export function InboxView({
  status,
  onStatus,
  items,
  channels,
  ownerRef,
  selectedId,
  onSelect,
}: InboxViewProps) {
  const selected = items.find((item) => item.id === selectedId) ?? null;
  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <div className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Inbox filter">
          {(["unread", "all", "archived"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              className={cn(
                "rounded-md px-2 py-1 text-sm capitalize",
                status === value ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
              onClick={() => onStatus(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <ul className="space-y-1">
          {items.length === 0 ? (
            <li className="text-muted-foreground text-sm">No inquiries here.</li>
          ) : (
            items.map((item) => {
              const unread = item.readAt == null && item.archivedAt == null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm",
                      unread ? "bg-muted font-semibold" : "text-muted-foreground",
                      selectedId === item.id && "ring-ring ring-1",
                    )}
                    onClick={() => onSelect(item)}
                  >
                    {text(item.payload.senderName) || "Inquiry"}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
      <div>
        {selected ? (
          <InboxDetail item={selected} channels={channels} ownerRef={ownerRef} />
        ) : (
          <p className="text-muted-foreground text-sm">Select an inquiry.</p>
        )}
      </div>
    </div>
  );
}

function InboxDetail({
  item,
  channels,
  ownerRef,
}: {
  item: InboxItem;
  channels: ChannelOption[];
  ownerRef: string;
}) {
  const payload = item.payload;
  const email = text(payload.senderEmail);
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
    <article className="space-y-3">
      <p className="whitespace-pre-wrap text-sm">{text(payload.message)}</p>
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
      {zip ? <p className="text-muted-foreground text-sm">Zip {zip}</p> : null}
      {email ? (
        <a className="text-foreground text-sm underline" href={`mailto:${email}`}>
          Reply by email
        </a>
      ) : null}
    </article>
  );
}

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}
