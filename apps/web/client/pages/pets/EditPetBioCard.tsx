"use client";

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
        <CardTitle>Edit {petName}&apos;s bio</CardTitle>
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
