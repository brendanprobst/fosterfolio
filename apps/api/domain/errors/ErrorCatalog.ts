import { ResultError } from '@api/domain/errors/ResultError';
import { AuthErrors } from '@api/domain/errors/catalogs/AuthErrors';
import { CommonErrors } from '@api/domain/errors/catalogs/CommonErrors';
import { PetErrors } from '@api/domain/errors/catalogs/PetErrors';
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

  static readonly PET_NOT_FOUND = PetErrors.NOT_FOUND;
  static readonly PET_FORBIDDEN = PetErrors.FORBIDDEN;
  static readonly PET_INVALID_INPUT = PetErrors.INVALID_INPUT;
  static readonly PET_NAME_REQUIRED = PetErrors.NAME_REQUIRED;
  static readonly PET_SPECIES_INVALID = PetErrors.SPECIES_INVALID;

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

export { AuthErrors, CommonErrors, PetErrors, UserErrors };
