export type SocialLink = { label: string; url: string };

export type UserPublic = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  sheltersText: string | null;
  socialLinks: SocialLink[];
  starCount: number;
  createdAt: string;
};

export type UserOwner = UserPublic & {
  email: string;
  zipCode: string | null;
  lat: number | null;
  lng: number | null;
};

export type UserProfileUpdate = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  zipCode?: string | null;
  socialLinks?: SocialLink[] | null;
  sheltersText?: string | null;
  handle?: string | null;
};

export function isUserOwner(user: UserPublic | UserOwner): user is UserOwner {
  return "email" in user && typeof (user as UserOwner).email === "string";
}
