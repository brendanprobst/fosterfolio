import { PetEditorPage } from "@client/pages/profile";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <PetEditorPage mode="edit" />
    </Suspense>
  );
}
