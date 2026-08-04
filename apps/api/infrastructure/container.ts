import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { NoopGeoLookupAdapter } from '@api/infrastructure/adapters/geo/NoopGeoLookupAdapter';
import { ZippopotamGeoLookupAdapter } from '@api/infrastructure/adapters/geo/ZippopotamGeoLookupAdapter';
import { createAllowlistModule } from '@api/infrastructure/composition/allowlist';
import { createInquiriesModule } from '@api/infrastructure/composition/inquiries';
import { createPetsModule } from '@api/infrastructure/composition/pets';
import { createPostsModule } from '@api/infrastructure/composition/posts';
import { createSearchModule } from '@api/infrastructure/composition/search';
import { createStarsModule } from '@api/infrastructure/composition/stars';
import { createUsersModule } from '@api/infrastructure/composition/users';
import { Logger } from '@api/utils/logger';

function hasSupabaseEnv(): boolean {
  return (
    !!process.env.SUPABASE_URL?.trim() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Service Container - composition root.
 *
 * Domain wiring lives in `infrastructure/composition/*`.
 */
export class Container {
  private readonly users: ReturnType<typeof createUsersModule>;
  private readonly pets: ReturnType<typeof createPetsModule>;
  private readonly posts: ReturnType<typeof createPostsModule>;
  private readonly stars: ReturnType<typeof createStarsModule>;
  private readonly search: ReturnType<typeof createSearchModule>;
  private readonly inquiries: ReturnType<typeof createInquiriesModule>;
  private readonly allowlist: ReturnType<typeof createAllowlistModule>;

  constructor() {
    let dataAdapter: SupabaseAdapter | null = null;

    if (hasSupabaseEnv()) {
      dataAdapter = new SupabaseAdapter();
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when NODE_ENV=production',
      );
    } else {
      Logger.warning(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory repositories (dev only). Data is lost on restart. Email allowlist requires Supabase. Copy apps/api/.env.example to apps/api/.env for Supabase.',
      );
    }

    const geoLookup = dataAdapter
      ? new ZippopotamGeoLookupAdapter()
      : new NoopGeoLookupAdapter();

    this.users = createUsersModule(dataAdapter, geoLookup);
    this.pets = createPetsModule(dataAdapter, this.users.userRepository);
    this.posts = createPostsModule(
      dataAdapter,
      this.pets.petRepository,
      this.users.userRepository
    );
    this.stars = createStarsModule(dataAdapter, this.users.userRepository);
    this.search = createSearchModule(
      dataAdapter,
      this.users.userRepository,
      this.pets.petRepository
    );
    this.inquiries = createInquiriesModule(
      dataAdapter,
      this.users.userRepository,
      this.pets.petRepository
    );
    this.allowlist = createAllowlistModule(dataAdapter);
  }

  isAllowlistConfigured(): boolean {
    return this.allowlist.isAllowlistConfigured();
  }

  getAllowedEmailRepository() {
    return this.allowlist.getAllowedEmailRepository();
  }

  getUserRepository() {
    return this.users.userRepository;
  }

  getGetUserUseCase() {
    return this.users.getGetUserUseCase();
  }

  getUpdateUserUseCase() {
    return this.users.getUpdateUserUseCase();
  }

  getPetRepository() {
    return this.pets.petRepository;
  }

  getCreatePetUseCase() {
    return this.pets.getCreatePetUseCase();
  }

  getGetPetUseCase() {
    return this.pets.getGetPetUseCase();
  }

  getUpdatePetUseCase() {
    return this.pets.getUpdatePetUseCase();
  }

  getSoftDeletePetUseCase() {
    return this.pets.getSoftDeletePetUseCase();
  }

  getListPetsByOwnerUseCase() {
    return this.pets.getListPetsByOwnerUseCase();
  }

  getGetPetUpdatesUseCase() {
    return this.pets.getGetPetUpdatesUseCase();
  }

  getCreatePostUseCase() {
    return this.posts.getCreatePostUseCase();
  }

  getGetPostUseCase() {
    return this.posts.getGetPostUseCase();
  }

  getUpdatePostUseCase() {
    return this.posts.getUpdatePostUseCase();
  }

  getSoftDeletePostUseCase() {
    return this.posts.getSoftDeletePostUseCase();
  }

  getListFeedUseCase() {
    return this.posts.getListFeedUseCase();
  }

  getListPostsByAuthorUseCase() {
    return this.posts.getListPostsByAuthorUseCase();
  }

  getAddStarUseCase() {
    return this.stars.getAddStarUseCase();
  }

  getGetStarCountUseCase() {
    return this.stars.getGetStarCountUseCase();
  }

  getSearchUseCase() {
    return this.search.getSearchUseCase();
  }

  getCreateInquiryUseCase() {
    return this.inquiries.getCreateInquiryUseCase();
  }
}
