import { E2E_SEED, seedFosterfolioE2eData } from '@api/infrastructure/e2eSeed';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryPostRepository } from '@api/infrastructure/repositories/InMemoryPostRepository';
import { InMemorySearchRepository } from '@api/infrastructure/repositories/InMemorySearchRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

describe('e2e seed fixtures', () => {
  it('seeds the Playwright user, pet, feed post, and search hits', async () => {
    const userRepository = new InMemoryUserRepository();
    const petRepository = new InMemoryPetRepository();
    const postRepository = new InMemoryPostRepository(
      petRepository,
      userRepository
    );

    expect(
      seedFosterfolioE2eData({ userRepository, petRepository, postRepository })
    ).toBe(true);

    const user = await userRepository.findById(E2E_SEED.userId);
    expect(user?.email).toBe(E2E_SEED.userEmail);
    expect(user?.toPublicDto().displayName).toBe(E2E_SEED.userDisplayName);

    const pet = await petRepository.findById(E2E_SEED.petId);
    expect(pet?.toListDto().name).toBe(E2E_SEED.petName);

    const feed = await postRepository.listFeed({ limit: 10 });
    expect(feed.posts.map((row) => row.post.toPublicDto().bodyText)).toEqual(
      expect.arrayContaining([E2E_SEED.generalPostBody, E2E_SEED.petUpdateBody])
    );

    const search = new InMemorySearchRepository(userRepository, petRepository);
    const pets = await search.searchPets('mochi', 10);
    const users = await search.searchUsers('alex', 10);
    expect(pets[0]?.id).toBe(E2E_SEED.petId);
    expect(users[0]?.id).toBe(E2E_SEED.userId);
  });
});
