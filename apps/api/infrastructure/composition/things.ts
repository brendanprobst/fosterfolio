import { CreateThingUseCase } from '@api/application/use-cases/CreateThingUseCase';
import { DeleteThingUseCase } from '@api/application/use-cases/DeleteThingUseCase';
import { GetThingByIdUseCase } from '@api/application/use-cases/GetThingByIdUseCase';
import { ListThingsUseCase } from '@api/application/use-cases/ListThingsUseCase';
import { UpdateThingUseCase } from '@api/application/use-cases/UpdateThingUseCase';
import type { IThingRepository } from '@api/domain/repositories/IThingRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryThingRepository } from '@api/infrastructure/repositories/InMemoryThingRepository';
import { ThingRepository } from '@api/infrastructure/repositories/ThingRepository';

export type ThingsModule = {
  thingRepository: IThingRepository;
  getCreateThingUseCase: () => CreateThingUseCase;
  getGetThingByIdUseCase: () => GetThingByIdUseCase;
  getListThingsUseCase: () => ListThingsUseCase;
  getUpdateThingUseCase: () => UpdateThingUseCase;
  getDeleteThingUseCase: () => DeleteThingUseCase;
};

export function createThingsModule(dataAdapter: DataAdapter | null): ThingsModule {
  const thingRepository: IThingRepository = dataAdapter
    ? new ThingRepository(dataAdapter)
    : new InMemoryThingRepository();

  return {
    thingRepository,
    getCreateThingUseCase: () => new CreateThingUseCase(thingRepository),
    getGetThingByIdUseCase: () => new GetThingByIdUseCase(thingRepository),
    getListThingsUseCase: () => new ListThingsUseCase(thingRepository),
    getUpdateThingUseCase: () => new UpdateThingUseCase(thingRepository),
    getDeleteThingUseCase: () => new DeleteThingUseCase(thingRepository),
  };
}
