"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@client/components/ui/tooltip";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import {
  parseShelterLinks,
  serializeShelterLinks,
  type ShelterLink,
} from "@client/lib/shelterLinks";
import { Info, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type ProfileLocationDialogProps = {
  user: UserOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ZIP_HELP = "Used to help find adopters in your area.";

function emptyRow(): ShelterLink {
  return { name: "", url: "" };
}

function seededShelters(raw: string | null): ShelterLink[] {
  const next = parseShelterLinks(raw);
  return next.length > 0 ? next : [emptyRow()];
}

/**
 * ZIP plus the shelters that place animals with this foster. Shelter links are
 * stored as JSON in `shelters_text` until they get their own table.
 */
export function ProfileLocationDialog({
  user,
  open,
  onOpenChange,
}: ProfileLocationDialogProps) {
  const mutation = useUpdateUserMutation();
  const [zipCode, setZipCode] = useState(user.zipCode ?? "");
  const [shelters, setShelters] = useState<ShelterLink[]>(() =>
    seededShelters(user.sheltersText),
  );

  useEffect(() => {
    if (!open) return;
    setZipCode(user.zipCode ?? "");
    setShelters(seededShelters(user.sheltersText));
  }, [open, user.zipCode, user.sheltersText]);

  function updateRow(index: number, patch: Partial<ShelterLink>) {
    setShelters((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: user.id,
        payload: {
          zipCode: zipCode.trim() || null,
          sheltersText: serializeShelterLinks(shelters),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Location & shelters</DialogTitle>
          <DialogDescription>
            Your ZIP helps find adopters nearby. Add the organizations that place
            animals with you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit location and shelters">
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
            <p className="text-muted-foreground text-xs">{ZIP_HELP}</p>
          </div>
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Shelters you work with</p>
              <p className="text-muted-foreground text-xs">
                The organizations that place animals with you.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground hidden gap-2 text-xs font-medium lg:grid lg:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_auto]">
                <span>Name</span>
                <span>Website</span>
                <span className="sr-only">Remove</span>
              </div>
              {shelters.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_auto]"
                >
                  <Input
                    aria-label={`Shelter ${index + 1} name`}
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                  <Input
                    aria-label={`Shelter ${index + 1} website`}
                    placeholder="https://"
                    className="min-w-0"
                    value={row.url}
                    onChange={(e) => updateRow(index, { url: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="justify-self-end lg:justify-self-auto"
                    aria-label={`Remove shelter ${index + 1}`}
                    onClick={() =>
                      setShelters((current) =>
                        current.length > 1
                          ? current.filter((_, i) => i !== index)
                          : [emptyRow()],
                      )
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShelters((current) => [...current, emptyRow()])}
            >
              <Plus aria-hidden />
              Add shelter
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
