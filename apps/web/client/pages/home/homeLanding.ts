import { Link2, Mail, PawPrint, Pencil, QrCode, Tag } from "lucide-react";

/** `/` hero; unchanged by `fork:init` / scaffold (see `scripts/fork.mjs`). */
export const HOME_LANDING_HERO_TITLE = "Fosterfolio";

export const HOME_LANDING_TAGLINE =
  "Public pet bios and QR collar tags for foster homes.";

export const HOME_LANDING_HOW =
  "When someone opens the link, they can message you about that pet. You keep a private editor; visitors see the public bio.";

export const HOME_LANDING_STEPS = [
  { step: 1, title: "Add a pet", icon: PawPrint },
  { step: 2, title: "Share link", icon: Link2 },
  { step: 3, title: "Adopters submit applications", icon: Mail },
] as const;

export const HOME_LANDING_FEATURES = [
  {
    title: "Shareable bios",
    body: "Pages for your pets and yourself — photos, status, and the details people ask for.",
    icon: Tag,
  },
  {
    title: "QR for tags and flyers",
    body: "A code for a pet bio, or a Foster-me link that always opens whoever you’re fostering now.",
    icon: QrCode,
  },
  {
    title: "Inquiries by email",
    body: "Visitors send a name, email, and message. You never publish your address on the page.",
    icon: Mail,
  },
  {
    title: "A private editor",
    body: "Update bios, photos, and shelter links from your profile. Visitors only see the public view.",
    icon: Pencil,
  },
] as const;
