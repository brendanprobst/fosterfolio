import { ResultError } from '@api/domain/errors/ResultError';

/**
 * HttpErrorMapper - reads HTTP status from ResultError.
 *
 * Status lives on the error itself (see domain error catalogs). This helper
 * remains so ResponseHandler and tests keep a single call site.
 */
export class HttpErrorMapper {
  static getStatusCode(error: ResultError): number {
    return typeof error.status === 'number' && error.status > 0 ? error.status : 500;
  }
}
