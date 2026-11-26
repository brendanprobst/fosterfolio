import { GetUserUseCase } from '@api/application/use-cases/GetUserUseCase';
import { ListPetsByOwnerUseCase } from '@api/application/use-cases/ListPetsByOwnerUseCase';

const HANDLE = 'elisa-probst';

describe('user lookup failures are logged', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('GetUserUseCase logs the exception and the handle, and still returns 500', async () => {
    const boom = new Error('invalid input syntax for type date');
    const repo = {
      findById: jest.fn().mockRejectedValue(boom),
      findByHandle: jest.fn().mockRejectedValue(boom),
      countStars: jest.fn(),
    } as any;

    const result = await new GetUserUseCase(repo).execute(HANDLE);

    expect(result.isFailure()).toBe(true);
    expect(result.getError().code).toBe('INTERNAL_SERVER_ERROR');
    expect(errorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain('[GetUserUseCase] unexpected error');
    expect(logged).toContain('invalid input syntax for type date');
  });

  it('ListPetsByOwnerUseCase logs the exception and the owner id, and still returns 500', async () => {
    const boom = new Error('owner lookup exploded');
    const userRepo = {
      findById: jest.fn().mockRejectedValue(boom),
      findByHandle: jest.fn().mockRejectedValue(boom),
    } as any;
    const petRepo = { listByOwnerId: jest.fn() } as any;

    const result = await new ListPetsByOwnerUseCase(petRepo, userRepo).execute(HANDLE);

    expect(result.isFailure()).toBe(true);
    expect(result.getError().code).toBe('INTERNAL_SERVER_ERROR');
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain('[ListPetsByOwnerUseCase] unexpected error');
    expect(logged).toContain('owner lookup exploded');
  });
});
