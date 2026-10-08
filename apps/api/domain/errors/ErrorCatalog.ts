import { ResultError } from '@api/domain/errors/ResultError';
import { AuthErrors } from '@api/domain/errors/catalogs/AuthErrors';
import { CommonErrors } from '@api/domain/errors/catalogs/CommonErrors';
import { InquiryErrors } from '@api/domain/errors/catalogs/InquiryErrors';
import { PetErrors } from '@api/domain/errors/catalogs/PetErrors';
import { PostErrors } from '@api/domain/errors/catalogs/PostErrors';
import { SearchErrors } from '@api/domain/errors/catalogs/SearchErrors';
import { StarErrors } from '@api/domain/errors/catalogs/StarErrors';
import { StorageErrors } from '@api/domain/errors/catalogs/StorageErrors';
import { TrackedLinkErrors } from '@api/domain/errors/catalogs/TrackedLinkErrors';
import { UserErrors } from '@api/domain/errors/catalogs/UserErrors';

/**
 * Compatibility facade over per-domain error modules.
 */
export class ErrorCatalog {
  static readonly INTERNAL_SERVER_ERROR = CommonErrors.INTERNAL_SERVER_ERROR;
  static readonly EMAIL_NOT_APPROVED = AuthErrors.EMAIL_NOT_APPROVED;
  static readonly ALLOWLIST_UNAVAILABLE = AuthErrors.ALLOWLIST_UNAVAILABLE;

  static readonly USER_NOT_FOUND = UserErrors.NOT_FOUND;
  static readonly USER_FORBIDDEN = UserErrors.FORBIDDEN;
  static readonly USER_INVALID_INPUT = UserErrors.INVALID_INPUT;
  static readonly HANDLE_INVALID = UserErrors.HANDLE_INVALID;
  static readonly HANDLE_BLOCKLISTED = UserErrors.HANDLE_BLOCKLISTED;
  static readonly HANDLE_TAKEN = UserErrors.HANDLE_TAKEN;

  static readonly PET_NOT_FOUND = PetErrors.NOT_FOUND;
  static readonly PET_FORBIDDEN = PetErrors.FORBIDDEN;
  static readonly PET_INVALID_INPUT = PetErrors.INVALID_INPUT;
  static readonly PET_NAME_REQUIRED = PetErrors.NAME_REQUIRED;
  static readonly PET_SPECIES_INVALID = PetErrors.SPECIES_INVALID;
  static readonly PET_PHOTOS_INVALID = PetErrors.PHOTOS_INVALID;
  static readonly PET_PHOTOS_LIMIT = PetErrors.PHOTOS_LIMIT;

  static readonly POST_NOT_FOUND = PostErrors.NOT_FOUND;
  static readonly POST_FORBIDDEN = PostErrors.FORBIDDEN;
  static readonly POST_INVALID_INPUT = PostErrors.INVALID_INPUT;
  static readonly POST_TYPE_INVALID = PostErrors.TYPE_INVALID;
  static readonly POST_PET_REQUIRED = PostErrors.PET_REQUIRED;

  static readonly STAR_INVALID_INPUT = StarErrors.INVALID_INPUT;
  static readonly STAR_USER_NOT_FOUND = StarErrors.USER_NOT_FOUND;

  static readonly SEARCH_QUERY_REQUIRED = SearchErrors.QUERY_REQUIRED;

  static readonly INQUIRY_INVALID_INPUT = InquiryErrors.INVALID_INPUT;
  static readonly INQUIRY_TARGET_NOT_FOUND = InquiryErrors.TARGET_NOT_FOUND;
  static readonly INQUIRY_EMAIL_FAILED = InquiryErrors.EMAIL_FAILED;

  static readonly TRACKED_LINK_NOT_FOUND = TrackedLinkErrors.NOT_FOUND;
  static readonly TRACKED_LINK_FORBIDDEN = TrackedLinkErrors.FORBIDDEN;
  static readonly TRACKED_LINK_INVALID_INPUT = TrackedLinkErrors.INVALID_INPUT;

  static readonly STORAGE_INVALID_INPUT = StorageErrors.INVALID_INPUT;
  static readonly STORAGE_CONTENT_TYPE_INVALID = StorageErrors.CONTENT_TYPE_INVALID;
  static readonly STORAGE_CAP_EXCEEDED = StorageErrors.CAP_EXCEEDED;

  static formatError(
    baseError: ResultError,
    metadata: Record<string, string | number>
  ): ResultError {
    return ResultError.create(
      baseError.code,
      baseError.message,
      baseError.status,
      metadata
    );
  }
}

export {
  AuthErrors,
  CommonErrors,
  InquiryErrors,
  PetErrors,
  PostErrors,
  SearchErrors,
  StarErrors,
  StorageErrors,
  TrackedLinkErrors,
  UserErrors,
};
