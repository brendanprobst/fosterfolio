import { UserRepository } from '@api/infrastructure/repositories/UserRepository';

describe('UserRepository.findById with a non-uuid id', () => {
  it('returns null without querying the uuid column', async () => {
    const get = jest.fn().mockRejectedValue(new Error('invalid input syntax for type uuid'));
    const repo = new UserRepository({ get } as any);

    await expect(repo.findById('elisa-probst')).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});
