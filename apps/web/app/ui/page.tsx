import { UiGalleryPage } from "@client/pages/ui-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI kit · Fosterfolio",
  description: "Fosterfolio interface samples.",
};

export default function UiKitPage() {
  return <UiGalleryPage />;
}
