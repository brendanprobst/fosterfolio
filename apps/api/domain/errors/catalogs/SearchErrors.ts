import { ResultError } from '@api/domain/errors/ResultError';

export class SearchErrors {
  static readonly QUERY_REQUIRED = ResultError.create(
    'SEARCH_QUERY_REQUIRED',
    'Enter something to search for.',
    400
  );
}
