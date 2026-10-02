import { ResultError } from '@api/domain/errors/ResultError';

export class StorageErrors {
  static readonly INVALID_INPUT = ResultError.create(
    'STORAGE_INVALID_INPUT',
    'Choose an image file to upload.',
    400
  );

  static readonly CONTENT_TYPE_INVALID = ResultError.create(
    'STORAGE_CONTENT_TYPE_INVALID',
    'Upload a JPEG, PNG, WebP, or GIF.',
    400
  );

  static readonly CAP_EXCEEDED = ResultError.create(
    'STORAGE_CAP_EXCEEDED',
    "You've used up your storage. Remove a photo to upload more.",
    413
  );
}
