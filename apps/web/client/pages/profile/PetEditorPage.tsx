"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import { Button } from "@client/components/ui/button";
import { usePet } from "@client/features/pets";
import { petEditorReturnPath } from "@client/lib/petEditorPath";
import { useRouter, useSearchParams } from "next/navigation";
import { PetEditor } from "./PetEditor";

type PetEditorPageProps = {
  mode: "create" | "edit";
};

/**
 * Full-page pet create/edit (not a dialog). Return path comes from `?from=`.
 */
export function PetEditorPage({ mode }: PetEditorPageProps) {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const petId = mode === "edit" ? params.get("petId") : null;
  const returnPath = petEditorReturnPath(params.get("from"));
  const petQuery = usePet(petId);

  function done() {
    router.push(returnPath);
  }

  if (loading || !user) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading profile...</main>
      </AppShell>
    );
  }

  if (mode === "edit" && !petId) {
    return (
      <AppShell active="profile">
        <main className="mx-auto max-w-2xl space-y-3 px-4 py-8">
          <p className="text-muted-foreground text-sm">Pet not found.</p>
          <Button type="button" variant="outline" onClick={done}>
            Back
          </Button>
        </main>
      </AppShell>
    );
  }

  if (mode === "edit" && petQuery.isLoading) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading pet...</main>
      </AppShell>
    );
  }

  if (mode === "edit" && (petQuery.isError || !petQuery.data)) {
    return (
      <AppShell active="profile">
        <main className="mx-auto max-w-2xl space-y-3 px-4 py-8">
          <p className="text-destructive text-sm">
            {petQuery.error instanceof Error
              ? petQuery.error.message
              : "Failed to load pet."}
          </p>
          <Button type="button" variant="outline" onClick={done}>
            Back
          </Button>
        </main>
      </AppShell>
    );
  }

  const pet = mode === "edit" ? (petQuery.data ?? null) : null;
  if (pet && pet.ownerId !== user.id) {
    return (
      <AppShell active="profile">
        <main className="mx-auto max-w-2xl space-y-3 px-4 py-8">
          <p className="text-muted-foreground text-sm">You can only edit your own pets.</p>
          <Button type="button" variant="outline" onClick={done}>
            Back
          </Button>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell active="profile">
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pet ? `Edit ${pet.name}` : "Add a pet"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {pet
              ? "Update this pet’s bio page — photo, status, and the details adopters see."
              : "Create a shareable bio page and a QR code for their collar tag."}
          </p>
        </header>
        <PetEditor pet={pet} onClose={done} />
      </main>
    </AppShell>
  );
}
