"use client";

import { BioPreview } from "@client/components/BioPreview";
import { Markdown } from "@client/components/markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { useState } from "react";

type PublicBioProps = {
  name: string;
  bio: string;
};

/**
 * Public profile bio, indented to the name/handle column (avatar is size-16 +
 * gap-4). Long bios clamp on the page and expand in the default wide Dialog.
 */
export function PublicBio({ name, bio }: PublicBioProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-20" aria-label="Bio" role="region">
      <BioPreview
        bio={bio}
        markdownClassName="prose prose-neutral text-foreground max-w-none text-sm leading-relaxed prose-a:text-primary [&_p]:mb-0"
        onReadMore={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>About this foster parent</DialogDescription>
          </DialogHeader>
          <Markdown>{bio}</Markdown>
        </DialogContent>
      </Dialog>
    </div>
  );
}
