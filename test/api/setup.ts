/**
 * Test setup - Creates isolated test app instances
 */
import { CreatePetUseCase } from '@api/application/use-cases/CreatePetUseCase';
import { GetPetUpdatesUseCase } from '@api/application/use-cases/GetPetUpdatesUseCase';
import { GetPetUseCase } from '@api/application/use-cases/GetPetUseCase';
import { GetUserUseCase } from '@api/application/use-cases/GetUserUseCase';
import { ListPetsByOwnerUseCase } from '@api/application/use-cases/ListPetsByOwnerUseCase';
import { SoftDeletePetUseCase } from '@api/application/use-cases/SoftDeletePetUseCase';
import { UpdatePetUseCase } from '@api/application/use-cases/UpdatePetUseCase';
import { UpdateUserUseCase } from '@api/application/use-cases/UpdateUserUseCase';
import { User } from '@api/domain/entities/User';
import { resetProtectedMiddlewareStackForTests } from '@api/auth/createProtectedMiddlewareStack';
import { NoopGeoLookupAdapter } from '@api/infrastructure/adapters/geo/NoopGeoLookupAdapter';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import { Container } from '@api/infrastructure/container';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { StubAllowedEmailRepository } from './support/StubAllowedEmailRepository';

export class TestContainer {
  readonly userRepository = new InMemoryUserRepository();
  readonly petRepository = new InMemoryPetRepository();
  private allowedEmailRepository = new StubAllowedEmailRepository();
  private geoLookup: GeoLookupAdapter = new NoopGeoLookupAdapter();

  setGeoLookup(adapter: GeoLookupAdapter): void {
    this.geoLookup = adapter;
  }

  seedUser(input: {
    id: string;
    email: string;
    displayName?: string | null;
    starCount?: number;
  }): User {
    const user = new User({
      id: input.id,
      email: input.email,
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
    return new GetPetUseCase(this.petRepository);
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
