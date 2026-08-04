import { CreatePetUseCase } from '@api/application/use-cases/CreatePetUseCase';
import { GetPetUpdatesUseCase } from '@api/application/use-cases/GetPetUpdatesUseCase';
import { GetPetUseCase } from '@api/application/use-cases/GetPetUseCase';
import { ListPetsByOwnerUseCase } from '@api/application/use-cases/ListPetsByOwnerUseCase';
import { SoftDeletePetUseCase } from '@api/application/use-cases/SoftDeletePetUseCase';
import { UpdatePetUseCase } from '@api/application/use-cases/UpdatePetUseCase';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { PetRepository } from '@api/infrastructure/repositories/PetRepository';

export type PetsModule = {
  petRepository: IPetRepository;
  getCreatePetUseCase: () => CreatePetUseCase;
  getGetPetUseCase: () => GetPetUseCase;
  getUpdatePetUseCase: () => UpdatePetUseCase;
  getSoftDeletePetUseCase: () => SoftDeletePetUseCase;
  getListPetsByOwnerUseCase: () => ListPetsByOwnerUseCase;
  getGetPetUpdatesUseCase: () => GetPetUpdatesUseCase;
};

export function createPetsModule(
  dataAdapter: DataAdapter | null,
  userRepository: IUserRepository
): PetsModule {
  const petRepository: IPetRepository = dataAdapter
    ? new PetRepository(dataAdapter)
    : new InMemoryPetRepository();

  return {
    petRepository,
    getCreatePetUseCase: () => new CreatePetUseCase(petRepository),
    getGetPetUseCase: () => new GetPetUseCase(petRepository),
    getUpdatePetUseCase: () => new UpdatePetUseCase(petRepository),
    getSoftDeletePetUseCase: () => new SoftDeletePetUseCase(petRepository),
    getListPetsByOwnerUseCase: () =>
      new ListPetsByOwnerUseCase(petRepository, userRepository),
    getGetPetUpdatesUseCase: () => new GetPetUpdatesUseCase(petRepository),
  };
}
