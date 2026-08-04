import {
  Post,
  type PostType,
  isPostType,
} from '@api/domain/entities/Post';
import type {
  CreatePostInput,
  FeedCursor,
  FeedPage,
  IPostRepository,
} from '@api/domain/repositories/IPostRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type PetEmbed = {
  name: string | null;
  primary_photo_url: string | null;
} | null;

type PostRecord = {
  id: string;
  author_id: string;
  post_type: string;
  pet_id: string | null;
  body_text: string | null;
  image_url: string | null;
  geo_lock: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pet?: PetEmbed;
};

const POST_SELECT =
  'id,author_id,post_type,pet_id,body_text,image_url,geo_lock,created_at,updated_at,deleted_at,pet:pets(name,primary_photo_url)';

function toStored(row: PostRecord): {
  post: Post;
  petName: string | null;
  petPrimaryPhotoUrl: string | null;
} {
  const postType: PostType = isPostType(row.post_type)
    ? row.post_type
    : 'general';
  const post = new Post({
    id: row.id,
    authorId: row.author_id,
    postType,
    petId: row.pet_id,
    bodyText: row.body_text,
    imageUrl: row.image_url,
    geoLock: row.geo_lock,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  });
  return {
    post,
    petName: row.pet?.name ?? null,
    petPrimaryPhotoUrl: row.pet?.primary_photo_url ?? null,
  };
}

export class PostRepository implements IPostRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_POSTS_TABLE?.trim() || 'posts';
  }

  async findById(id: string): Promise<{
    post: Post;
    petName: string | null;
    petPrimaryPhotoUrl: string | null;
  } | null> {
    const rows = await this.dataAdapter.get<PostRecord[]>(
      `${this.table}?select=${POST_SELECT}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toStored(row) : null;
  }

  async create(input: CreatePostInput): Promise<Post> {
    const payload = {
      author_id: input.authorId,
      post_type: input.postType as PostType,
      pet_id: input.petId ?? null,
      body_text: input.bodyText?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      geo_lock: input.geoLock?.trim() || 'local',
    };
    const rows = await this.dataAdapter.insertReturning<PostRecord[]>(
      this.table,
      [payload]
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Post insert returned no row');
    }
    // insertReturning may omit embed; reload for pet fields when needed.
    if (row.pet_id) {
      const full = await this.findById(row.id);
      if (full) return full.post;
    }
    return toStored(row).post;
  }

  async save(post: Post): Promise<void> {
    const row = post.toPersistence();
    const { id, ...rest } = row;
    await this.dataAdapter.update(
      `${this.table}?id=eq.${encodeURIComponent(String(id))}`,
      rest,
      {
        headers: {
          Prefer: 'return=minimal',
        },
      }
    );
  }

  async listFeed(options: {
    limit: number;
    cursor?: FeedCursor;
  }): Promise<FeedPage> {
    const fetchLimit = options.limit + 1;
    let path = `${this.table}?select=${POST_SELECT}&deleted_at=is.null&order=created_at.desc,id.desc&limit=${fetchLimit}`;
    if (options.cursor) {
      const ts = encodeURIComponent(options.cursor.createdAt.toISOString());
      const id = encodeURIComponent(options.cursor.id);
      path += `&or=(created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id}))`;
    }
    const rows = await this.dataAdapter.get<PostRecord[]>(path);
    const hasMore = rows.length > options.limit;
    const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
    return {
      posts: pageRows.map(toStored),
      hasMore,
    };
  }

  async listByAuthorId(
    authorId: string,
    options?: { excludePetUpdates?: boolean }
  ): Promise<
    Array<{
      post: Post;
      petName: string | null;
      petPrimaryPhotoUrl: string | null;
    }>
  > {
    let path = `${this.table}?select=${POST_SELECT}&author_id=eq.${encodeURIComponent(authorId)}&deleted_at=is.null&order=created_at.desc`;
    if (options?.excludePetUpdates) {
      path += `&post_type=neq.pet_update`;
    }
    const rows = await this.dataAdapter.get<PostRecord[]>(path);
    return rows.map(toStored);
  }
}
