import { GetUserUseCase } from '@api/application/use-cases/GetUserUseCase';
import { UpdateUserUseCase } from '@api/application/use-cases/UpdateUserUseCase';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { UserRepository } from '@api/infrastructure/repositories/UserRepository';

export type UsersModule = {
  userRepository: IUserRepository;
  getGetUserUseCase: () => GetUserUseCase;
  getUpdateUserUseCase: () => UpdateUserUseCase;
};

export function createUsersModule(
  dataAdapter: DataAdapter | null,
  geoLookup: GeoLookupAdapter
): UsersModule {
  const userRepository: IUserRepository = dataAdapter
    ? new UserRepository(dataAdapter)
    : new InMemoryUserRepository();

  return {
    userRepository,
    getGetUserUseCase: () => new GetUserUseCase(userRepository),
    getUpdateUserUseCase: () => new UpdateUserUseCase(userRepository, geoLookup),
  };
}
