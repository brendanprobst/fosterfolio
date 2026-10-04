import { SearchUseCase } from '@api/application/use-cases/SearchUseCase';
import type { ISearchRepository } from '@api/domain/repositories/ISearchRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemorySearchRepository } from '@api/infrastructure/repositories/InMemorySearchRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { SearchRepository } from '@api/infrastructure/repositories/SearchRepository';

export type SearchModule = {
  searchRepository: ISearchRepository;
  getSearchUseCase: () => SearchUseCase;
};

export function createSearchModule(
  dataAdapter: DataAdapter | null,
  userRepository: InMemoryUserRepository | unknown,
  petRepository: InMemoryPetRepository | unknown
): SearchModule {
  const searchRepository: ISearchRepository = dataAdapter
    ? new SearchRepository(dataAdapter)
    : new InMemorySearchRepository(
        userRepository as InMemoryUserRepository,
        petRepository as InMemoryPetRepository
      );

  return {
    searchRepository,
    getSearchUseCase: () => new SearchUseCase(searchRepository),
  };
}
