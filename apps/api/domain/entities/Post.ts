export const POST_TYPES = ['general', 'pet_update'] as const;
export type PostType = (typeof POST_TYPES)[number];

export function isPostType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

export type PostPublicDto = {
  id: string;
  authorId: string;
  postType: PostType;
  petId: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  geoLock: string;
  createdAt: string;
  updatedAt: string;
  /** Present on feed cards when post_type is pet_update. */
  petName: string | null;
  petPrimaryPhotoUrl: string | null;
};

export type PostOwnerDto = PostPublicDto;

export type PostProps = {
  id: string;
  authorId: string;
  postType: PostType;
  petId: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  geoLock: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Post {
  constructor(private props: PostProps) {}

  get id(): string {
    return this.props.id;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get postType(): PostType {
    return this.props.postType;
  }

  get petId(): string | null {
    return this.props.petId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.authorId === userId;
  }

  softDelete(at = new Date()): void {
    this.props.deletedAt = at;
  }

  applyUpdate(input: {
    bodyText?: string | null;
    imageUrl?: string | null;
    geoLock?: string;
  }): void {
    if (input.bodyText !== undefined) {
      this.props.bodyText =
        input.bodyText === null ? null : input.bodyText.trim() || null;
    }
    if (input.imageUrl !== undefined) {
      this.props.imageUrl =
        input.imageUrl === null ? null : input.imageUrl.trim() || null;
    }
    if (input.geoLock !== undefined) {
      this.props.geoLock = input.geoLock.trim() || 'local';
    }
    this.props.updatedAt = new Date();
  }

  toPublicDto(pet?: {
    name: string | null;
    primaryPhotoUrl: string | null;
  } | null): PostPublicDto {
    const isPetUpdate = this.props.postType === 'pet_update';
    return {
      id: this.props.id,
      authorId: this.props.authorId,
      postType: this.props.postType,
      petId: this.props.petId,
      bodyText: this.props.bodyText,
      imageUrl: this.props.imageUrl,
      geoLock: this.props.geoLock,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      petName: isPetUpdate ? (pet?.name ?? null) : null,
      petPrimaryPhotoUrl: isPetUpdate ? (pet?.primaryPhotoUrl ?? null) : null,
    };
  }

  toOwnerDto(pet?: {
    name: string | null;
    primaryPhotoUrl: string | null;
  } | null): PostOwnerDto {
    return this.toPublicDto(pet);
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this.props.id,
      author_id: this.props.authorId,
      post_type: this.props.postType,
      pet_id: this.props.petId,
      body_text: this.props.bodyText,
      image_url: this.props.imageUrl,
      geo_lock: this.props.geoLock,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString() ?? null,
    };
  }
}
