import { cn } from "@client/lib/utils";

type DataPageSkeletonProps = {
  label: string;
  variant: "profile" | "pet" | "owner-pet" | "editor" | "list" | "analytics" | "inbox";
  /** Sit inside an existing page column instead of the full page frame. */
  embedded?: boolean;
};

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-xl ring-1 ring-foreground/5", className)}
    />
  );
}

function ProfileShape() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:order-2 lg:block">
        <Bone className="h-48" />
      </aside>
      <div className="min-w-0 space-y-8">
        <Bone className="h-16 lg:hidden" />
        <div className="flex items-start gap-4">
          <Bone className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Bone className="h-7 w-48 max-w-full" />
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-full max-w-md" />
            <Bone className="h-4 w-2/3 max-w-sm" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Bone className="h-28" />
          <Bone className="h-28" />
        </div>
        <div className="space-y-3">
          <Bone className="h-6 w-28" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Bone className="h-40" />
            <Bone className="h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PetShape() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <aside className="hidden space-y-4 lg:order-2 lg:block">
        <Bone className="h-36" />
        <Bone className="h-44" />
      </aside>
      <div className="min-w-0 space-y-4">
        <Bone className="h-16 lg:hidden" />
        <Bone className="aspect-[4/3] w-full" />
        <Bone className="h-8 w-40" />
        <Bone className="h-4 w-56" />
        <Bone className="h-4 w-full max-w-lg" />
        <Bone className="h-4 w-4/5 max-w-md" />
      </div>
    </div>
  );
}

/** Owner tools above the fold: header + actions, analytics card, pet inquiries. */
function OwnerPetShape() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-9 w-48" />
          <Bone className="h-4 w-56 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-32" />
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
      <div className="bg-card space-y-4 rounded-xl p-6 ring-1 ring-foreground/10">
        <Bone className="h-6 w-40" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Bone className="h-32" />
          <Bone className="h-32" />
          <Bone className="h-32" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-32" />
          <Bone className="h-8 w-36" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-20" />
        </div>
        <div className="grid h-[28rem] gap-4 md:grid-cols-[22rem_1fr]">
          <div className="space-y-2">
            <Bone className="h-16" />
            <Bone className="h-16" />
            <Bone className="h-16" />
            <Bone className="h-16" />
          </div>
          <Bone className="hidden h-full md:block" />
        </div>
      </div>
    </div>
  );
}

function EditorShape() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72 max-w-full" />
      <Bone className="aspect-[4/3] w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-10 w-full" />
      <Bone className="h-28 w-full" />
      <Bone className="h-10 w-28" />
    </div>
  );
}

function AnalyticsShape() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-8 w-56" />
        <Bone className="h-8 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Bone className="h-24" />
        <Bone className="h-24" />
        <Bone className="h-24" />
      </div>
      <Bone className="h-56" />
      <Bone className="h-40" />
    </div>
  );
}

function InboxShape() {
  return (
    <div className="space-y-4">
      <Bone className="h-8 w-32" />
      <div className="grid gap-4 md:grid-cols-[22rem_1fr]">
        <div className="space-y-2">
          <Bone className="h-16" />
          <Bone className="h-16" />
          <Bone className="h-16" />
          <Bone className="h-16" />
          <Bone className="h-16" />
        </div>
        <Bone className="h-80" />
      </div>
    </div>
  );
}

function ListShape() {
  return (
    <div className="space-y-3">
      <Bone className="h-24" />
      <Bone className="h-24" />
      <Bone className="h-24" />
    </div>
  );
}

/**
 * Pulse layout shown while a data-heavy page is still fetching, so visitors
 * don't see an empty profile or a one-line "Loading…" message.
 */
export function DataPageSkeleton({ label, variant, embedded = false }: DataPageSkeletonProps) {
  const shape =
    variant === "profile" ? (
      <ProfileShape />
    ) : variant === "pet" ? (
      <PetShape />
    ) : variant === "owner-pet" ? (
      <OwnerPetShape />
    ) : variant === "editor" ? (
      <EditorShape />
    ) : variant === "analytics" ? (
      <AnalyticsShape />
    ) : variant === "inbox" ? (
      <InboxShape />
    ) : (
      <ListShape />
    );

  return (
    <div
      className={cn(!embedded && "mx-auto w-full max-w-5xl px-4 py-8")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {shape}
    </div>
  );
}
