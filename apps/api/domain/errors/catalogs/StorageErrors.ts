import { ResultError } from '@api/domain/errors/ResultError';

export class StorageErrors {
  static readonly INVALID_INPUT = ResultError.create(
    'STORAGE_INVALID_INPUT',
    'filename and contentType are required.',
    400
  );

  static readonly CONTENT_TYPE_INVALID = ResultError.create(
    'STORAGE_CONTENT_TYPE_INVALID',
    'Only image/jpeg, image/png, image/webp, and image/gif uploads are allowed.',
    400
  );

  static readonly CAP_EXCEEDED = ResultError.create(
    'STORAGE_CAP_EXCEEDED',
    "You've used up your storage. Remove a photo to upload more.",
    413
  );
}
