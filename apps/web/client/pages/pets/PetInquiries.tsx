"use client";

import { useAuth } from "@client/auth";
import { InboxLayout, InboxList } from "@client/components/inbox";
import { fetchNotifications } from "@client/features/notifications/notificationsApi";
import { notificationKeys } from "@client/features/notifications/queryKeys";
import type { InboxItem } from "@client/features/notifications/types";
import { useNotificationActions } from "@client/features/notifications/useNotificationActions";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import { InquiryDetail } from "@client/pages/inbox/InboxView";
import { toInboxEntry } from "@client/pages/inbox/inquiryEntry";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type PetInquiriesProps = {
  petId: string;
  petName: string;
  ownerRef: string;
};

/**
 * Owner-only inquiries about one pet: a height-capped inbox list + viewer.
 * No status tabs or archiving — those live on the full inbox.
 */
export function PetInquiries({ petId, petName, ownerRef }: PetInquiriesProps) {
  const { getAccessToken } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { markRead } = useNotificationActions();

  const inquiries = useQuery({
    queryKey: notificationKeys.petList(petId),
    queryFn: async () =>
      fetchNotifications((await getAccessToken()) ?? "", "all", { petId }),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });

  const items = inquiries.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function open(item: InboxItem) {
    setSelectedId(item.id);
    markRead(item);
  }

  return (
    <section aria-labelledby="pet-inquiries-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pet-inquiries-heading" className="text-lg font-semibold">
          Inquiries about {petName}
        </h2>
        <Link href="/inbox" className="text-muted-foreground text-sm underline">
          Open inbox
        </Link>
      </div>
      <InboxLayout
        className="h-[28rem] min-h-0 grid-rows-[minmax(0,1fr)]"
        hasSelection={selected != null}
        onBack={() => setSelectedId(null)}
        backLabel="Back to inquiries"
        filters={null}
        list={
          <InboxList
            entries={items.map(toInboxEntry)}
            selectedId={selected ? selectedId : null}
            loading={inquiries.isLoading}
            onSelect={(id) => {
              const item = items.find((entry) => entry.id === id);
              if (item) open(item);
            }}
            empty={
              <div className="text-muted-foreground px-2 py-6 text-sm">
                <p className="text-foreground font-medium">No inquiries yet.</p>
                <p>Share {petName}&apos;s link or QR code to get the word out.</p>
              </div>
            }
          />
        }
        detail={
          selected ? (
            <InquiryDetail
              item={selected}
              channels={channels.data ?? []}
              ownerRef={ownerRef}
            />
          ) : (
            <div className="text-muted-foreground flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-sm">
              <Inbox aria-hidden className="size-8" />
              <p>Select an inquiry to read it.</p>
            </div>
          )
        }
      />
    </section>
  );
}
