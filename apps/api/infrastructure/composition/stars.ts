import { AddStarUseCase } from '@api/application/use-cases/AddStarUseCase';
import { GetStarCountUseCase } from '@api/application/use-cases/GetStarCountUseCase';
import type { IStarRepository } from '@api/domain/repositories/IStarRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryStarRepository } from '@api/infrastructure/repositories/InMemoryStarRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { StarRepository } from '@api/infrastructure/repositories/StarRepository';

export type StarsModule = {
  starRepository: IStarRepository;
  getAddStarUseCase: () => AddStarUseCase;
  getGetStarCountUseCase: () => GetStarCountUseCase;
};

export function createStarsModule(
  dataAdapter: DataAdapter | null,
  userRepository: IUserRepository
): StarsModule {
  const starRepository: IStarRepository = dataAdapter
    ? new StarRepository(dataAdapter)
    : new InMemoryStarRepository(
        userRepository instanceof InMemoryUserRepository
          ? userRepository
          : undefined
      );

  return {
    starRepository,
    getAddStarUseCase: () => new AddStarUseCase(starRepository, userRepository),
    getGetStarCountUseCase: () =>
      new GetStarCountUseCase(starRepository, userRepository),
  };
}
