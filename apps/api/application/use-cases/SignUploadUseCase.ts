import { randomUUID } from 'crypto';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { StorageAdapter } from '@api/infrastructure/adapters/storage/StorageAdapter';

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type SignUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  contentType: string;
  /** Bytes already used by this user before this upload. */
  usedBytes: number;
  /** Configured per-user cap. */
  capBytes: number;
};

/** Default 50MB. Override with STORAGE_CAP_BYTES. */
export const DEFAULT_STORAGE_CAP_BYTES = 50 * 1024 * 1024;

export function resolveStorageCapBytes(
  envValue = process.env.STORAGE_CAP_BYTES
): number {
  if (envValue === undefined || envValue.trim() === '') {
    return DEFAULT_STORAGE_CAP_BYTES;
  }
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_STORAGE_CAP_BYTES;
  }
  return parsed;
}

export function sanitizeUploadFilename(filename: string): string | null {
  const base = filename.replace(/\\/g, '/').split('/').pop()?.trim() ?? '';
  if (!base || base === '.' || base === '..') return null;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
}

export class SignUploadUseCase {
  constructor(
    private readonly storageAdapter: StorageAdapter,
    private readonly capBytes: number = resolveStorageCapBytes()
  ) {}

  async execute(input: {
    userId: string;
    filename: string;
    contentType: string;
    contentLength?: number;
  }): Promise<Result<SignUploadResult>> {
    const contentType = input.contentType?.trim().toLowerCase() ?? '';
    const safeName = sanitizeUploadFilename(input.filename ?? '');
    if (!safeName || !contentType) {
      return Result.failure(ErrorCatalog.STORAGE_INVALID_INPUT);
    }
    if (
      !(ALLOWED_UPLOAD_CONTENT_TYPES as readonly string[]).includes(contentType)
    ) {
      return Result.failure(ErrorCatalog.STORAGE_CONTENT_TYPE_INVALID);
    }

    try {
      const usedBytes = await this.storageAdapter.getUserStorageBytes(
        input.userId
      );
      if (usedBytes >= this.capBytes) {
        return Result.failure(ErrorCatalog.STORAGE_CAP_EXCEEDED);
      }
      if (
        input.contentLength !== undefined &&
        Number.isFinite(input.contentLength) &&
        input.contentLength > 0 &&
        usedBytes + input.contentLength > this.capBytes
      ) {
        return Result.failure(ErrorCatalog.STORAGE_CAP_EXCEEDED);
      }

      const path = `${input.userId}/${randomUUID()}-${safeName}`;
      const signed = await this.storageAdapter.createSignedUpload(path);
      return Result.success({
        uploadUrl: signed.uploadUrl,
        publicUrl: this.storageAdapter.getPublicUrl(path),
        path,
        contentType,
        usedBytes,
        capBytes: this.capBytes,
      });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
