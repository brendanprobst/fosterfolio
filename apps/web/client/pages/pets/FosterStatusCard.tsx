"use client";

import { buttonVariants } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { cn } from "@client/lib/utils";
import { fosterMeHref } from "@client/lib/userProfilePath";
import { PawPrint } from "lucide-react";
import Link from "next/link";
import { FosteredBy } from "./FosteredBy";

type FosterStatusCardProps = {
  petName: string;
  ownerRef: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  /** Permalink bios can send visitors to foster-me; foster-me never does. */
  mode: "permalink" | "foster-me";
  isCurrentFoster: boolean;
};

export function FosterStatusCard({
  petName,
  ownerRef,
  ownerName,
  ownerAvatarUrl,
  mode,
  isCurrentFoster,
}: FosterStatusCardProps) {
  const fosterName = ownerName || "this foster";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Interested in {petName}?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FosteredBy
          name={ownerName || "Foster profile"}
          avatarUrl={ownerAvatarUrl}
          ownerRef={ownerRef}
        />
        {isCurrentFoster ? (
          <p className="text-muted-foreground text-sm">
            Actively fostering {petName}
          </p>
        ) : mode === "permalink" ? (
          <div className="space-y-2">
            <p
              className="border-border bg-muted/40 rounded-lg border px-3 py-2 text-sm"
              role="status"
            >
              This pet isn’t actively fostered by {fosterName}.
            </p>
            <Link
              href={fosterMeHref(ownerRef)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full",
              )}
            >
              <PawPrint aria-hidden />
              See who they’re fostering now
            </Link>
          </div>
        ) : (
          <p
            className="border-border bg-muted/40 rounded-lg border px-3 py-2 text-sm"
            role="status"
          >
            This may not be who {fosterName} is fostering right now. Ask if{" "}
            {petName} is still looking for a home.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
