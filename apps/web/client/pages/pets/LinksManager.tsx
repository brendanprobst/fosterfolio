"use client";

import { QrThumbnail } from "@client/components/qr";
import { ShareQrDialog } from "@client/components/ShareQrDialog";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import type { ChannelOption, TrackedLinkItem } from "@client/features/petInsights/types";
import { absoluteUrl } from "@client/lib/absoluteUrl";
import { petHref } from "@client/lib/petBioPath";
import {
  Building2,
  Camera,
  Check,
  Copy,
  FileText,
  Music2,
  Plus,
  Signpost,
  Tag,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const CHANNEL_ICONS: Record<string, typeof Tag> = {
  lawn_sign: Signpost,
  instagram: Camera,
  facebook: Users,
  tiktok: Music2,
  flyer: FileText,
  shelter_listing: Building2,
  other: Tag,
};

function trackedHref(ownerRef: string, petId: string, code?: string): string {
  const path = petHref(ownerRef, petId);
  return code ? `${path}?s=${encodeURIComponent(code)}` : path;
}

function QrPreview({ href, alt }: { href: string; alt: string }) {
  return <QrThumbnail url={absoluteUrl(href)} alt={alt} />;
}

type LinksManagerProps = {
  petName: string;
  petId: string;
  ownerRef: string;
  links: TrackedLinkItem[];
  channels: ChannelOption[];
  onCreate: (input: { channelKey?: string; channelName?: string; label?: string | null }) => Promise<void>;
  onArchive: (link: TrackedLinkItem, archived: boolean) => Promise<void>;
};

export function LinksManager({
  petName,
  petId,
  ownerRef,
  links,
  channels,
  onCreate,
  onArchive,
}: LinksManagerProps) {
  const [channelKey, setChannelKey] = useState<string | null>(channels[0]?.key ?? null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ title: string; href: string } | null>(null);

  const active = links.filter((link) => !link.archivedAt);
  const archived = links.filter((link) => link.archivedAt);
  const groups = useMemo(() => {
    const map = new Map<string, TrackedLinkItem[]>();
    for (const link of active) {
      const rows = map.get(link.channelKey) ?? [];
      rows.push(link);
      map.set(link.channelKey, rows);
    }
    return [...map.entries()];
  }, [active]);

  async function copy(href: string, id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await navigator.clipboard.writeText(`${origin}${href}`);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  async function create() {
    setBusy(true);
    try {
      if (customOpen) {
        await onCreate({ channelName: customName, label: label || null });
      } else if (channelKey) {
        await onCreate({ channelKey, label: label || null });
      }
      setLabel("");
      setCustomName("");
      setCustomOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const originalHref = trackedHref(ownerRef, petId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Channel">
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.key] ?? Tag;
              const selected = !customOpen && channelKey === channel.key;
              return (
                <Button
                  key={channel.key}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => {
                    setCustomOpen(false);
                    setChannelKey(channel.key);
                  }}
                >
                  <Icon aria-hidden />
                  {channel.name}
                </Button>
              );
            })}
            <Button
              type="button"
              size="sm"
              variant={customOpen ? "default" : "outline"}
              onClick={() => setCustomOpen(true)}
            >
              <Plus aria-hidden />
              Add custom channel
            </Button>
          </div>
          {customOpen ? (
            <label className="block text-sm">
              Custom channel
              <input
                className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            Label <span className="text-muted-foreground">(optional)</span>
            <input
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="front yard"
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void create()}>
            Create link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-medium">Original QR</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <QrPreview href={originalHref} alt={`Original QR for ${petName}`} />
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">
            Untagged pet URL. Scans of this code show up as Direct / original QR.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setQr({ title: `${petName} original QR`, href: originalHref })}>
            Download QR
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy(originalHref, "original")}>
            {copiedId === "original" ? <Check aria-hidden /> : <Copy aria-hidden />}
            Copy link
          </Button>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active tracked links yet.</p>
      ) : (
        groups.map(([key, rows]) => (
          <section key={key} aria-label={rows[0]?.channelName ?? key} className="space-y-2">
            <h2 className="text-sm font-medium">{rows[0]?.channelName ?? key}</h2>
            {rows.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                href={trackedHref(ownerRef, petId, link.code)}
                copied={copiedId === link.id}
                onCopy={() => void copy(trackedHref(ownerRef, petId, link.code), link.id)}
                onDownload={() =>
                  setQr({
                    title: `${link.channelName} QR`,
                    href: trackedHref(ownerRef, petId, link.code),
                  })
                }
                onArchive={() => void onArchive(link, true)}
              />
            ))}
          </section>
        ))
      )}

      {archived.length > 0 ? (
        <details className="border-border rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Archived links</summary>
          <div className="mt-3 space-y-2">
            {archived.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                href={trackedHref(ownerRef, petId, link.code)}
                copied={copiedId === link.id}
                onCopy={() => void copy(trackedHref(ownerRef, petId, link.code), link.id)}
                onDownload={() =>
                  setQr({
                    title: `${link.channelName} QR`,
                    href: trackedHref(ownerRef, petId, link.code),
                  })
                }
                onArchive={() => void onArchive(link, false)}
                archived
              />
            ))}
          </div>
        </details>
      ) : null}

      <ShareQrDialog
        open={qr != null}
        onOpenChange={(open) => {
          if (!open) setQr(null);
        }}
        title={qr?.title ?? "QR"}
        href={qr?.href ?? originalHref}
        downloadName={petName}
        imageAlt={`QR code for ${petName}`}
      />
    </div>
  );
}

function LinkRow({
  link,
  href,
  copied,
  archived = false,
  onCopy,
  onDownload,
  onArchive,
}: {
  link: TrackedLinkItem;
  href: string;
  copied: boolean;
  archived?: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <QrPreview href={href} alt={`QR for ${link.channelName}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{link.channelName}</p>
        <p className="text-muted-foreground text-sm">{link.label || "No label"}</p>
        <p className="text-sm">
          {link.views} views · {link.inquiries} inquiries
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onDownload}>
        Download QR
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onArchive}>
        {archived ? "Unarchive" : "Archive"}
      </Button>
    </div>
  );
}
