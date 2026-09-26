"use client";

import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { Pencil } from "lucide-react";

type ProfileDetailsProps = {
  user: UserOwner;
  onEdit: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mb-2 sm:mb-0">{children}</dd>
    </>
  );
}

function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

/** Read-only summary; everything here is edited through `ProfileEditDialog`. */
export function ProfileDetails({ user, onEdit }: ProfileDetailsProps) {
  const location = [user.city, user.state].filter(Boolean).join(", ") || user.zipCode;

  return (
    <section className="space-y-3" aria-label="Profile details">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Details</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-4 text-sm sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-y-2">
        <Row label="Location">{location || <NotSet />}</Row>
        <Row label="Shelters">{user.sheltersText || <NotSet />}</Row>
        <Row label="Links">
          {user.socialLinks.length > 0 ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {user.socialLinks.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    href={link.url}
                    className="text-primary hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <NotSet />
          )}
        </Row>
      </dl>
    </section>
  );
}
