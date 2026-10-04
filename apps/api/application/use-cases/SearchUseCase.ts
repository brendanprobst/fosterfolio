import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type {
  ISearchRepository,
  SearchPetHit,
  SearchUserHit,
} from '@api/domain/repositories/ISearchRepository';

export type SearchResultDto = {
  pets: SearchPetHit[];
  users: SearchUserHit[];
};

export class SearchUseCase {
  constructor(private readonly searchRepository: ISearchRepository) {}

  async execute(query: string): Promise<Result<SearchResultDto>> {
    const q = query?.trim() ?? '';
    if (!q) {
      return Result.failure(ErrorCatalog.SEARCH_QUERY_REQUIRED);
    }

    try {
      const [pets, users] = await Promise.all([
        this.searchRepository.searchPets(q, 20),
        this.searchRepository.searchUsers(q, 20),
      ]);
      return Result.success({ pets, users });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
