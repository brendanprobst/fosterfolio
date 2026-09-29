"use client";

import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { Pencil } from "lucide-react";

type ConnectedSitesCardProps = {
  user: UserOwner;
  onManage: () => void;
};

/**
 * Places this foster posts about their animals — Instagram, a diary, TikTok.
 * Shelter websites live on `ProfileLocationCard` instead.
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
      <p className="text-muted-foreground mt-1 text-xs">
        Instagram, a foster diary, anywhere you post about the animals you foster.
      </p>
      <div className="mt-3">
        {user.socialLinks.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {user.socialLinks.map((link) => (
              <li key={`${link.label}-${link.url}`} className="truncate">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No places listed yet.</p>
        )}
      </div>
    </section>
  );
}
