"use client";

import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { Pencil } from "lucide-react";

type ConnectedSitesCardProps = {
  user: UserOwner;
  onManage: () => void;
};

/**
 * Places this foster posts about their animals — Instagram, a diary, TikTok.
 * The explanation lives in `SocialLinksDialog`. Shelter websites live on
 * `ProfileLocationCard` instead.
 */
export function ConnectedSitesCard({ user, onManage }: ConnectedSitesCardProps) {
  return (
    <section className="border-border rounded-xl border p-4" aria-label="Where you share">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Where you share</h2>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Manage where you share"
          onClick={onManage}
        >
          <Pencil aria-hidden />
        </Button>
      </div>
      {user.socialLinks.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {user.socialLinks.map((link) => (
            <li key={`${link.label}-${link.url}`}>
              <Badge
                variant="outline"
                render={
                  <a href={link.url} target="_blank" rel="noopener noreferrer" />
                }
              >
                {link.label}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">No places listed yet.</p>
      )}
    </section>
  );
}
