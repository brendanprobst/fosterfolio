import { randomUUID } from 'crypto';
import type {
  SignedUpload,
  StorageAdapter,
} from '@api/infrastructure/adapters/storage/StorageAdapter';

/** Test/dev storage: no real uploads; tracks per-user byte usage for cap checks. */
export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly usage = new Map<string, number>();

  setUserStorageBytes(userId: string, bytes: number): void {
    this.usage.set(userId, Math.max(0, bytes));
  }

  async getUserStorageBytes(userId: string): Promise<number> {
    return this.usage.get(userId) ?? 0;
  }

  async createSignedUpload(path: string): Promise<SignedUpload> {
    const token = randomUUID();
    return {
      path,
      token,
      uploadUrl: `https://storage.test/upload/sign/${encodeURIComponent(path)}?token=${token}`,
    };
  }

  getPublicUrl(path: string): string {
    const encoded = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `https://storage.test/public/fosterfolio-media/${encoded}`;
  }
}
