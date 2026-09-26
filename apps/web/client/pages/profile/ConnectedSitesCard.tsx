"use client";

import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { Pencil } from "lucide-react";

type ConnectedSitesCardProps = {
  user: UserOwner;
  onManage: () => void;
};

/**
 * Sits beside `ProfileLocationCard` (row on wide screens, stacked column on narrow
 * ones — the grid lives in `ProfilePage`). Same shape as that card — a muted heading
 * and a top-right icon button — but management always opens `SocialLinksDialog`
 * rather than expanding in place, since each link needs a label and a URL.
 */
export function ConnectedSitesCard({ user, onManage }: ConnectedSitesCardProps) {
  return (
    <section className="border-border rounded-xl border p-4" aria-label="Connected sites">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Connected sites</h2>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Manage connected sites"
          onClick={onManage}
        >
          <Pencil aria-hidden />
        </Button>
      </div>
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
          <p className="text-muted-foreground text-sm">No sites connected yet.</p>
        )}
      </div>
    </section>
  );
}
