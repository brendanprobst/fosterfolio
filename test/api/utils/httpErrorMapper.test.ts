import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { HttpErrorMapper } from '@api/utils/httpErrorMapper';

describe('HttpErrorMapper', () => {
  describe('getStatusCode', () => {
    it('reads status from PET_NOT_FOUND (404)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.PET_NOT_FOUND)).toBe(404);
    });

    it('preserves status when formatting errors with metadata', () => {
      const error = ErrorCatalog.formatError(ErrorCatalog.PET_NOT_FOUND, { id: 'x' });
      expect(HttpErrorMapper.getStatusCode(error)).toBe(404);
    });

    it('reads status from PET_NAME_REQUIRED (400)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.PET_NAME_REQUIRED)).toBe(400);
    });

    it('reads status from USER_FORBIDDEN (403)', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.USER_FORBIDDEN)).toBe(403);
    });

    it('reads status from tracked-link errors', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.TRACKED_LINK_NOT_FOUND)).toBe(404);
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.TRACKED_LINK_FORBIDDEN)).toBe(403);
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.TRACKED_LINK_INVALID_INPUT)).toBe(400);
    });
  });
});
