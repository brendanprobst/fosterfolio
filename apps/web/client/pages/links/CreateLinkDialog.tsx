"use client";

import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import type { ChannelOption } from "@client/features/petInsights/types";
import { cn } from "@client/lib/utils";
import {
  Building2,
  Camera,
  FileText,
  Music2,
  Signpost,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { useState } from "react";

const CHANNEL_ICONS: Record<string, typeof Tag> = {
  lawn_sign: Signpost,
  instagram: Camera,
  facebook: Users,
  tiktok: Music2,
  flyer: FileText,
  shelter_listing: Building2,
};

export type CreateLinkInput = { channelKey?: string; channelName?: string; label?: string | null };

type CreateLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: ChannelOption[];
  /** No active foster-me links yet: only "Create first link" is enabled. */
  firstRun: boolean;
  onCreateFirst: () => void;
  onCreate: (input: CreateLinkInput) => Promise<void>;
};

export function CreateLinkDialog({
  open,
  onOpenChange,
  channels,
  firstRun,
  onCreateFirst,
  onCreate,
}: CreateLinkDialogProps) {
  const [channelKey, setChannelKey] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const custom = customName.trim();
  const canCreate = !firstRun && !busy && Boolean(custom || channelKey);

  function reset() {
    setChannelKey(null);
    setCustomName("");
    setLabel("");
    setError(null);
  }

  async function submit() {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        ...(custom ? { channelName: custom } : { channelKey: channelKey! }),
        label: label.trim() || null,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create link</DialogTitle>
          <DialogDescription>
            Every link opens your foster-me page. Each one counts its own visits, so you can see
            where adopters come from.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          aria-label="Create link"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {firstRun ? (
            <button
              type="button"
              onClick={onCreateFirst}
              className="border-primary bg-primary/5 hover:bg-primary/10 focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-[3px]"
            >
              <Sparkles aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
              <span className="space-y-1">
                <span className="block font-medium">Create first link</span>
                <span className="text-muted-foreground block text-sm">
                  Start with your default link. You can add links for each channel after.
                </span>
              </span>
            </button>
          ) : null}
          <fieldset
            disabled={firstRun}
            className={cn("space-y-5", firstRun && "opacity-50")}
            aria-describedby={firstRun ? "first-run-note" : undefined}
          >
            {firstRun ? (
              <p id="first-run-note" className="sr-only">
                Create your first link before adding channel links.
              </p>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-medium" id="channel-label">
                Where will you share it?
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="channel-label">
                {channels.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel.key] ?? Tag;
                  const selected = !custom && channelKey === channel.key;
                  return (
                    <Button
                      key={channel.key}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => {
                        setCustomName("");
                        setChannelKey(channel.key);
                      }}
                    >
                      <Icon aria-hidden />
                      {channel.name}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-custom-channel">Custom channel</Label>
              <Input
                id="link-custom-channel"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                aria-describedby="link-custom-channel-hint"
              />
              <p id="link-custom-channel-hint" className="text-muted-foreground text-xs">
                Something else? e.g. Vet office, Shelter listing, Dog park board.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-label">
                Label <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="link-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Front yard"
              />
            </div>
          </fieldset>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={!canCreate}>
              Create link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
