import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import type {
  SignedUpload,
  StorageAdapter,
} from '@api/infrastructure/adapters/storage/StorageAdapter';

type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket?: string;
};

type SignResponse = {
  url?: string;
  token?: string;
};

/**
 * Supabase Storage signed uploads + usage via public.user_storage_bytes RPC.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly url: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor(
    private readonly dataAdapter: DataAdapter,
    config: SupabaseStorageConfig
  ) {
    this.url = config.url.replace(/\/+$/, '');
    this.serviceRoleKey = config.serviceRoleKey;
    this.bucket =
      config.bucket?.trim() ||
      process.env.SUPABASE_MEDIA_BUCKET?.trim() ||
      'fosterfolio-media';
  }

  async getUserStorageBytes(userId: string): Promise<number> {
    const result = await this.dataAdapter.rpc<number | string>(
      'user_storage_bytes',
      { p_user_id: userId }
    );
    const n = typeof result === 'number' ? result : Number(result);
    return Number.isFinite(n) ? n : 0;
  }

  async createSignedUpload(path: string): Promise<SignedUpload> {
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const response = await fetch(
      `${this.url}/storage/v1/object/upload/sign/${this.bucket}/${encodedPath}`,
      {
        method: 'POST',
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Supabase storage sign failed (${response.status}): ${text}`
      );
    }

    const body = (await response.json()) as SignResponse;
    if (!body.url) {
      throw new Error('Supabase storage sign returned no url');
    }

    const relative = body.url.startsWith('/') ? body.url : `/${body.url}`;
    const uploadUrl = `${this.url}/storage/v1${relative}`;
    const token =
      body.token ??
      new URL(uploadUrl).searchParams.get('token') ??
      '';
    if (!token) {
      throw new Error('Supabase storage sign returned no token');
    }

    return { uploadUrl, path, token };
  }

  getPublicUrl(path: string): string {
    const encoded = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.url}/storage/v1/object/public/${this.bucket}/${encoded}`;
  }
}
