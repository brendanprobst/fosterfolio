"use client";

import { OwnerOnlyLabel } from "@client/components/OwnerOnlyLabel";
import { buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import { cn } from "@client/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";

type EditPetBioCardProps = {
  petName: string;
  petId: string;
  returnPath: string;
  linkLabel: string;
};

export function EditPetBioCard({
  petName,
  petId,
  returnPath,
  linkLabel,
}: EditPetBioCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-1">
          <OwnerOnlyLabel />
          <CardTitle>Edit {petName}&apos;s bio</CardTitle>
        </div>
        <CardDescription>
          Change what visitors and adopters see on this public page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={petEditorEditHref(petId, returnPath)}
          className={cn(buttonVariants({ size: "sm" }), "w-full")}
        >
          <Pencil aria-hidden />
          {linkLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
