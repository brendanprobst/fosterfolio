import { ResultError } from '@api/domain/errors/ResultError';
import { AuthErrors } from '@api/domain/errors/catalogs/AuthErrors';
import { CommonErrors } from '@api/domain/errors/catalogs/CommonErrors';
import { ThingErrors } from '@api/domain/errors/catalogs/ThingErrors';

/**
 * Compatibility facade over per-domain error modules.
 *
 * New domains should add `domain/errors/catalogs/<Domain>Errors.ts` and re-export
 * stable aliases here only when call sites still need the flat catalog.
 */
export class ErrorCatalog {
  static readonly THING_NOT_FOUND = ThingErrors.NOT_FOUND;
  static readonly THING_NAME_INVALID = ThingErrors.NAME_INVALID;
  static readonly INTERNAL_SERVER_ERROR = CommonErrors.INTERNAL_SERVER_ERROR;
  static readonly EMAIL_NOT_APPROVED = AuthErrors.EMAIL_NOT_APPROVED;
  static readonly ALLOWLIST_UNAVAILABLE = AuthErrors.ALLOWLIST_UNAVAILABLE;

  /**
   * Helper method to create a formatted error from a catalog error with metadata.
   * Preserves the base error's HTTP status.
   */
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

export { AuthErrors, CommonErrors, ThingErrors };
