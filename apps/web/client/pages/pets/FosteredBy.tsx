"use client";

import { UserAvatar } from "@client/components/UserAvatar";
import { userProfileHref } from "@client/lib/userProfilePath";
import Link from "next/link";

type FosteredByProps = {
  name: string;
  avatarUrl: string | null;
  ownerRef: string;
};

export function FosteredBy({ name, avatarUrl, ownerRef }: FosteredByProps) {
  const displayName = name || "Foster profile";
  return (
    <section className="flex items-center gap-3" aria-label="Foster">
      <UserAvatar name={displayName} url={avatarUrl} size="sm" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">Fostered by</p>
        <Link
          href={userProfileHref(ownerRef)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {displayName}
        </Link>
      </div>
    </section>
  );
}
