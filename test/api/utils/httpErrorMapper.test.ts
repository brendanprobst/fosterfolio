import { HttpErrorMapper } from '@api/utils/httpErrorMapper';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { ResultError } from '@api/domain/errors/ResultError';

describe('HttpErrorMapper', () => {
  describe('getStatusCode', () => {
    it('reads status from THING_NOT_FOUND (404)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.THING_NOT_FOUND)).toBe(404);
    });

    it('preserves status on formatted errors', () => {
      const error = ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id: 'x' });
      expect(HttpErrorMapper.getStatusCode(error)).toBe(404);
    });

    it('reads status from THING_NAME_INVALID (400)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.THING_NAME_INVALID)).toBe(400);
    });

    it('reads status from EMAIL_NOT_APPROVED (403)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.EMAIL_NOT_APPROVED)).toBe(403);
    });

    it('reads status from ALLOWLIST_UNAVAILABLE (503)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.ALLOWLIST_UNAVAILABLE)).toBe(503);
    });

    it('reads status from INTERNAL_SERVER_ERROR (500)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.INTERNAL_SERVER_ERROR)).toBe(500);
    });

    it('defaults missing/invalid status to 500', () => {
      const unknownError = ResultError.create('UNKNOWN_ERROR', 'Unknown error');
      expect(HttpErrorMapper.getStatusCode(unknownError)).toBe(500);
    });
  });
});
