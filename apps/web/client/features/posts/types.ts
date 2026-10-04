export type PostType = "general" | "pet_update";

export type PostPublic = {
  id: string;
  authorId: string;
  authorHandle: string | null;
  postType: PostType;
  petId: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  geoLock: string;
  createdAt: string;
  updatedAt: string;
  petName: string | null;
  petPrimaryPhotoUrl: string | null;
};

export type FeedPage = {
  items: PostPublic[];
  nextCursor: string | null;
};

export type CreatePostPayload = {
  postType: PostType;
  petId?: string | null;
  bodyText?: string | null;
  imageUrl?: string | null;
};
