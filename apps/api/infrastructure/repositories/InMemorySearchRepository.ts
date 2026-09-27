import type {
  ISearchRepository,
  SearchPetHit,
  SearchUserHit,
} from '@api/domain/repositories/ISearchRepository';
import type { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import type { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

export class InMemorySearchRepository implements ISearchRepository {
  constructor(
    private readonly userRepository: InMemoryUserRepository,
    private readonly petRepository: InMemoryPetRepository
  ) {}

  async searchPets(query: string, limit: number): Promise<SearchPetHit[]> {
    const q = query.toLowerCase();
    const pets = await this.petRepository.listAllForSearch();
    const hits = pets
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, limit);
    return Promise.all(
      hits.map(async (p) => {
        const owner = await this.userRepository.findById(p.ownerId);
        return {
          id: p.id,
          name: p.name,
          species: p.species,
          primaryPhotoUrl: p.primaryPhotoUrl,
          ownerId: p.ownerId,
          ownerHandle: owner?.handle ?? null,
        };
      })
    );
  }

  async searchUsers(query: string, limit: number): Promise<SearchUserHit[]> {
    const q = query.toLowerCase();
    const users = await this.userRepository.listAllForSearch();
    return users
      .filter((u) => (u.displayName ?? '').toLowerCase().includes(q))
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        handle: u.handle,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        city: u.city,
        state: u.state,
      }));
  }
}
