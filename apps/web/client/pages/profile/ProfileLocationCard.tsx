"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@client/components/ui/tooltip";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { cn } from "@client/lib/utils";
import { Building2, Info, MapPin, Pencil, X } from "lucide-react";
import { FormEvent, useState } from "react";

type ProfileLocationCardProps = {
  user: UserOwner;
};

/**
 * Location and shelters, below the header separator. Icon rows instead of a
 * label/value list; the pencil expands the same box into a small form in place, no
 * dialog. Saving (or cancelling) shrinks it back to the compact display.
 */
export function ProfileLocationCard({ user }: ProfileLocationCardProps) {
  const mutation = useUpdateUserMutation();
  const [editing, setEditing] = useState(false);
  const [zipCode, setZipCode] = useState(user.zipCode ?? "");
  const [sheltersText, setSheltersText] = useState(user.sheltersText ?? "");

  const location = [user.city, user.state].filter(Boolean).join(", ") || user.zipCode;

  function startEditing() {
    setZipCode(user.zipCode ?? "");
    setSheltersText(user.sheltersText ?? "");
    setEditing(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: user.id,
        payload: {
          zipCode: zipCode.trim() || null,
          sheltersText: sheltersText.trim() || null,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <section className="border-border rounded-xl border p-4" aria-label="Location and shelters">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Location & shelters</h2>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={editing ? "Cancel editing location" : "Edit location and shelters"}
          onClick={() => (editing ? setEditing(false) : startEditing())}
        >
          {editing ? <X aria-hidden /> : <Pencil aria-hidden />}
        </Button>
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="mt-3 space-y-3" aria-label="Edit location and shelters">
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to save."}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="location-zip">ZIP code</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label="How the ZIP code is used"
                    className="text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <Info className="size-3.5" aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent>
                    Your city and state update from this ZIP when the lookup succeeds. A
                    ZIP we cannot find still saves.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="location-zip"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              autoComplete="postal-code"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location-shelters">Shelters you work with</Label>
            <Input
              id="location-shelters"
              value={sheltersText}
              onChange={(e) => setSheltersText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className={cn(!location && "text-muted-foreground")}>
              {location || "Add your location"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className={cn(!user.sheltersText && "text-muted-foreground")}>
              {user.sheltersText || "Add the shelters you work with"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
