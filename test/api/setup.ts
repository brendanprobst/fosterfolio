/**
 * Test setup - Creates isolated test app instances
 */
import { AddStarUseCase } from '@api/application/use-cases/AddStarUseCase';
import { CreateInquiryUseCase } from '@api/application/use-cases/CreateInquiryUseCase';
import { CreatePetUseCase } from '@api/application/use-cases/CreatePetUseCase';
import { CreatePostUseCase } from '@api/application/use-cases/CreatePostUseCase';
import { GetPetUpdatesUseCase } from '@api/application/use-cases/GetPetUpdatesUseCase';
import { GetPetUseCase } from '@api/application/use-cases/GetPetUseCase';
import { GetPostUseCase } from '@api/application/use-cases/GetPostUseCase';
import { GetStarCountUseCase } from '@api/application/use-cases/GetStarCountUseCase';
import { GetUserUseCase } from '@api/application/use-cases/GetUserUseCase';
import { ListFeedUseCase } from '@api/application/use-cases/ListFeedUseCase';
import { ListPetsByOwnerUseCase } from '@api/application/use-cases/ListPetsByOwnerUseCase';
import { ListPostsByAuthorUseCase } from '@api/application/use-cases/ListPostsByAuthorUseCase';
import { SearchUseCase } from '@api/application/use-cases/SearchUseCase';
import { SoftDeletePetUseCase } from '@api/application/use-cases/SoftDeletePetUseCase';
import { SoftDeletePostUseCase } from '@api/application/use-cases/SoftDeletePostUseCase';
import {
  SignUploadUseCase,
  resolveStorageCapBytes,
} from '@api/application/use-cases/SignUploadUseCase';
import { UpdatePetUseCase } from '@api/application/use-cases/UpdatePetUseCase';
import { UpdatePostUseCase } from '@api/application/use-cases/UpdatePostUseCase';
import { UpdateUserUseCase } from '@api/application/use-cases/UpdateUserUseCase';
import { User } from '@api/domain/entities/User';
import { resetProtectedMiddlewareStackForTests } from '@api/auth/createProtectedMiddlewareStack';
import { NoopGeoLookupAdapter } from '@api/infrastructure/adapters/geo/NoopGeoLookupAdapter';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';
import { LoggingEmailAdapter } from '@api/infrastructure/adapters/email/LoggingEmailAdapter';
import { InMemoryStorageAdapter } from '@api/infrastructure/adapters/storage/InMemoryStorageAdapter';
import { Container } from '@api/infrastructure/container';
import { InMemoryInquiryRepository } from '@api/infrastructure/repositories/InMemoryInquiryRepository';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryPostRepository } from '@api/infrastructure/repositories/InMemoryPostRepository';
import { InMemorySearchRepository } from '@api/infrastructure/repositories/InMemorySearchRepository';
import { InMemoryStarRepository } from '@api/infrastructure/repositories/InMemoryStarRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { StubAllowedEmailRepository } from './support/StubAllowedEmailRepository';

export class TestContainer {
  readonly userRepository = new InMemoryUserRepository();
  readonly petRepository = new InMemoryPetRepository();
  readonly postRepository = new InMemoryPostRepository(this.petRepository);
  readonly starRepository = new InMemoryStarRepository(this.userRepository);
  readonly inquiryRepository = new InMemoryInquiryRepository();
  readonly searchRepository = new InMemorySearchRepository(
    this.userRepository,
    this.petRepository
  );
  readonly storageAdapter = new InMemoryStorageAdapter();
  private allowedEmailRepository = new StubAllowedEmailRepository();
  private geoLookup: GeoLookupAdapter = new NoopGeoLookupAdapter();
  private emailAdapter: EmailAdapter = new LoggingEmailAdapter();
  private storageCapBytes = resolveStorageCapBytes();

  setGeoLookup(adapter: GeoLookupAdapter): void {
    this.geoLookup = adapter;
  }

  setEmailAdapter(adapter: EmailAdapter): void {
    this.emailAdapter = adapter;
  }

  setStorageCapBytes(bytes: number): void {
    this.storageCapBytes = bytes;
  }

  seedUser(input: {
    id: string;
    email: string;
    displayName?: string | null;
    handle?: string | null;
    starCount?: number;
  }): User {
    const user = new User({
      id: input.id,
      email: input.email,
      handle: input.handle ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: null,
      bio: null,
      zipCode: null,
      city: null,
      state: null,
      lat: null,
      lng: null,
      socialLinks: [],
      sheltersText: null,
      createdAt: new Date(),
      deletedAt: null,
    });
    this.userRepository.seed(user, input.starCount ?? 0);
    this.starRepository.seedCount(input.id, input.starCount ?? 0);
    return user;
  }

  getUserRepository() {
    return this.userRepository;
  }

  getPetRepository() {
    return this.petRepository;
  }

  getAllowedEmailRepository() {
    return this.allowedEmailRepository;
  }

  isAllowlistConfigured(): boolean {
    return true;
  }

  getGetUserUseCase() {
    return new GetUserUseCase(this.userRepository);
  }

  getUpdateUserUseCase() {
    return new UpdateUserUseCase(this.userRepository, this.geoLookup);
  }

  getCreatePetUseCase() {
    return new CreatePetUseCase(this.petRepository);
  }

  getGetPetUseCase() {
    return new GetPetUseCase(this.petRepository, this.userRepository);
  }

  getUpdatePetUseCase() {
    return new UpdatePetUseCase(this.petRepository);
  }

  getSoftDeletePetUseCase() {
    return new SoftDeletePetUseCase(this.petRepository);
  }

  getListPetsByOwnerUseCase() {
    return new ListPetsByOwnerUseCase(this.petRepository, this.userRepository);
  }

  getGetPetUpdatesUseCase() {
    return new GetPetUpdatesUseCase(this.petRepository);
  }

  getCreatePostUseCase() {
    return new CreatePostUseCase(this.postRepository, this.petRepository);
  }

  getGetPostUseCase() {
    return new GetPostUseCase(this.postRepository);
  }

  getUpdatePostUseCase() {
    return new UpdatePostUseCase(this.postRepository);
  }

  getSoftDeletePostUseCase() {
    return new SoftDeletePostUseCase(this.postRepository);
  }

  getListFeedUseCase() {
    return new ListFeedUseCase(this.postRepository);
  }

  getListPostsByAuthorUseCase() {
    return new ListPostsByAuthorUseCase(
      this.postRepository,
      this.userRepository
    );
  }

  getAddStarUseCase() {
    return new AddStarUseCase(this.starRepository, this.userRepository);
  }

  getGetStarCountUseCase() {
    return new GetStarCountUseCase(this.starRepository, this.userRepository);
  }

  getSearchUseCase() {
    return new SearchUseCase(this.searchRepository);
  }

  getCreateInquiryUseCase() {
    return new CreateInquiryUseCase(
      this.inquiryRepository,
      this.userRepository,
      this.petRepository,
      this.emailAdapter
    );
  }

  getSignUploadUseCase() {
    return new SignUploadUseCase(this.storageAdapter, this.storageCapBytes);
  }
}

function applyTestEnvDefaults(): void {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret';
  process.env.SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER || 'https://test-project.supabase.co/auth/v1';
  process.env.SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
}

export function createTestApp() {
  applyTestEnvDefaults();
  resetProtectedMiddlewareStackForTests();
  const { createApp } = require('@api/app') as typeof import('@api/app');
  return createApp(new TestContainer() as unknown as Container);
}

export function createTestAppWithContainer(): {
  app: ReturnType<typeof createTestApp>;
  container: TestContainer;
} {
  applyTestEnvDefaults();
  resetProtectedMiddlewareStackForTests();
  const { createApp } = require('@api/app') as typeof import('@api/app');
  const container = new TestContainer();
  const app = createApp(container as unknown as Container);
  return { app, container };
}
