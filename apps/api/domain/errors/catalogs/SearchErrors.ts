import { ResultError } from '@api/domain/errors/ResultError';

export class SearchErrors {
  static readonly QUERY_REQUIRED = ResultError.create(
    'SEARCH_QUERY_REQUIRED',
    'Query parameter q is required.',
    400
  );
}
