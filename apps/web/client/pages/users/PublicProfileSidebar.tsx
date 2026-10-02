"use client";

import type { SidebarMobileSummary } from "@client/components/layout/PageWithSidebar";
import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { InquiryForm } from "@client/features/inquiries";
import { cn } from "@client/lib/utils";
import { fosterMeHref } from "@client/lib/userProfilePath";
import { PawPrint, Pencil } from "lucide-react";
import Link from "next/link";

type PublicProfileSidebarProps = {
  handleOrId: string;
  displayName: string;
  userId: string;
  isOwner: boolean;
};

/** Short mobile launcher copy for the public-profile side panel. */
export function publicProfileMobileSummary(
  isOwner: boolean,
  displayName: string,
): SidebarMobileSummary {
  if (isOwner) {
    return {
      title: "Your page tools",
      description: "Edit your profile, or preview the Foster Me page visitors land on.",
    };
  }
  const name = displayName || "this foster";
  return {
    title: `Contact ${name}`,
    description: "See who they’re fostering now, or send a message about adopting.",
  };
}

export function PublicProfileSidebar({
  handleOrId,
  displayName,
  userId,
  isOwner,
}: PublicProfileSidebarProps) {
  if (isOwner) {
    return (
      <>
        <Card size="sm">
          <CardHeader>
            <div className="space-y-1">
              <OwnerOnlyLabel />
              <CardTitle>Your public page</CardTitle>
            </div>
            <CardDescription>
              This is what visitors see. Edit details and pets on your private
              profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/profile"
              className={cn(buttonVariants({ size: "sm" }), "w-full")}
            >
              <Pencil aria-hidden />
              Edit profile
            </Link>
            <Link
              href={fosterMeHref(handleOrId)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full",
              )}
            >
              <PawPrint aria-hidden />
              Preview &apos;Foster Me&apos; page
            </Link>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Interested in adopting?</CardTitle>
        <CardDescription>
          Ask {displayName || "this foster"} about a pet, or jump to whoever
          they’re fostering right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link
          href={fosterMeHref(handleOrId)}
          className={cn(buttonVariants({ size: "sm" }), "w-full")}
        >
          <PawPrint aria-hidden />
          See who they’re fostering now
        </Link>
        <InquiryForm
          targetUserId={userId}
          heading="Contact this foster"
          fosterName={displayName}
        />
      </CardContent>
    </Card>
  );
}
