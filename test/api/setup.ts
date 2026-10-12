/**
 * Test setup - Creates isolated test app instances
 */
import { GetNotificationPreferencesUseCase, PutNotificationPreferenceUseCase } from '@api/application/use-cases/NotificationPreferencesUseCases';
import { GetUnreadNotificationCountUseCase } from '@api/application/use-cases/GetUnreadNotificationCountUseCase';
import { ListNotificationsUseCase } from '@api/application/use-cases/ListNotificationsUseCase';
import { UpdateNotificationUseCase } from '@api/application/use-cases/UpdateNotificationUseCase';
import { ensureInquiryReceivedRegistered } from '@api/application/notifications/inquiryReceived';
import { GetOwnerLinkAnalyticsUseCase } from '@api/application/use-cases/GetOwnerLinkAnalyticsUseCase';
import { GetPetAnalyticsUseCase } from '@api/application/use-cases/GetPetAnalyticsUseCase';
import { AddStarUseCase } from '@api/application/use-cases/AddStarUseCase';
import { CreateInquiryUseCase } from '@api/application/use-cases/CreateInquiryUseCase';
import { ReportInquirySourceUseCase } from '@api/application/use-cases/ReportInquirySourceUseCase';
import { CreateOwnerLinkUseCase } from '@api/application/use-cases/CreateOwnerLinkUseCase';
import { CreateTrackedLinkUseCase } from '@api/application/use-cases/CreateTrackedLinkUseCase';
import { ListChannelsUseCase } from '@api/application/use-cases/ListChannelsUseCase';
import { ListOwnerLinksUseCase } from '@api/application/use-cases/ListOwnerLinksUseCase';
import { ListTrackedLinksUseCase } from '@api/application/use-cases/ListTrackedLinksUseCase';
import { ResolveTrackedLinkUseCase } from '@api/application/use-cases/ResolveTrackedLinkUseCase';
import { UpdateTrackedLinkUseCase } from '@api/application/use-cases/UpdateTrackedLinkUseCase';
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
import {
  verifyTurnstileToken,
  type TurnstileVerifier,
} from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';
import { LoggingEmailAdapter } from '@api/infrastructure/adapters/email/LoggingEmailAdapter';
import { EmailChannelAdapter } from '@api/infrastructure/adapters/email/EmailChannelAdapter';
import { InMemoryNotificationRepository } from '@api/infrastructure/repositories/InMemoryNotificationRepository';
import { InMemoryStorageAdapter } from '@api/infrastructure/adapters/storage/InMemoryStorageAdapter';
import { Container } from '@api/infrastructure/container';
import { InMemoryAnalyticsDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsDailyRepository';
import { InMemoryAnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsOwnerDailyRepository';
import { InMemoryInquiryRepository } from '@api/infrastructure/repositories/InMemoryInquiryRepository';
import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryPostRepository } from '@api/infrastructure/repositories/InMemoryPostRepository';
import { InMemorySearchRepository } from '@api/infrastructure/repositories/InMemorySearchRepository';
import { InMemoryStarRepository } from '@api/infrastructure/repositories/InMemoryStarRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { StubAllowedEmailRepository } from './support/StubAllowedEmailRepository';

export class TestContainer {
  readonly userRepository = new InMemoryUserRepository();
  readonly petRepository = new InMemoryPetRepository();
  readonly postRepository = new InMemoryPostRepository(
    this.petRepository,
    this.userRepository
  );
  readonly starRepository = new InMemoryStarRepository(this.userRepository);
  readonly inquiryRepository = new InMemoryInquiryRepository();
  readonly analyticsDailyRepository = new InMemoryAnalyticsDailyRepository();
  readonly analyticsOwnerDailyRepository = new InMemoryAnalyticsOwnerDailyRepository();
  readonly trackedLinkRepository = new InMemoryTrackedLinkRepository();
  readonly notificationRepository = new InMemoryNotificationRepository();
  readonly searchRepository = new InMemorySearchRepository(
    this.userRepository,
    this.petRepository
  );
  readonly storageAdapter = new InMemoryStorageAdapter();
  private allowedEmailRepository = new StubAllowedEmailRepository();
  private geoLookup: GeoLookupAdapter = new NoopGeoLookupAdapter();
  private emailAdapter: EmailAdapter = new LoggingEmailAdapter();
  private storageCapBytes = resolveStorageCapBytes();
  private turnstileSecret: string | null = null;
  private turnstileVerify: TurnstileVerifier = verifyTurnstileToken;

  setGeoLookup(adapter: GeoLookupAdapter): void {
    this.geoLookup = adapter;
  }

  setEmailAdapter(adapter: EmailAdapter): void {
    this.emailAdapter = adapter;
  }

  /** Jest leaves the secret unset so inquiries accept a missing Turnstile token. */
  setTurnstileSecret(secret: string | null, verify?: TurnstileVerifier): void {
    this.turnstileSecret = secret;
    if (verify) this.turnstileVerify = verify;
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
    ensureInquiryReceivedRegistered();
    return new CreateInquiryUseCase(
      this.inquiryRepository,
      this.userRepository,
      this.petRepository,
      {
        inApp: this.notificationRepository,
        email: new EmailChannelAdapter(this.emailAdapter),
        preferences: this.notificationRepository,
      },
      this.trackedLinkRepository,
      {
        getSecret: () => this.turnstileSecret,
        verify: this.turnstileVerify,
      }
    );
  }

  getReportInquirySourceUseCase() {
    return new ReportInquirySourceUseCase(this.inquiryRepository);
  }

  getSignUploadUseCase() {
    return new SignUploadUseCase(this.storageAdapter, this.storageCapBytes);
  }

  getCreateTrackedLinkUseCase() {
    return new CreateTrackedLinkUseCase(this.trackedLinkRepository, this.petRepository);
  }

  getCreateOwnerLinkUseCase() {
    return new CreateOwnerLinkUseCase(this.trackedLinkRepository, this.userRepository);
  }

  getListOwnerLinksUseCase() {
    return new ListOwnerLinksUseCase(this.trackedLinkRepository, this.petRepository);
  }

  getListTrackedLinksUseCase() {
    return new ListTrackedLinksUseCase(
      this.trackedLinkRepository,
      this.petRepository,
      this.analyticsDailyRepository,
      this.inquiryRepository
    );
  }

  getUpdateTrackedLinkUseCase() {
    return new UpdateTrackedLinkUseCase(this.trackedLinkRepository);
  }

  getResolveTrackedLinkUseCase() {
    return new ResolveTrackedLinkUseCase(this.trackedLinkRepository);
  }

  getListChannelsUseCase() {
    return new ListChannelsUseCase(this.trackedLinkRepository);
  }

  getGetPetAnalyticsUseCase() {
    return new GetPetAnalyticsUseCase(
      this.petRepository,
      this.analyticsDailyRepository,
      this.inquiryRepository
    );
  }

  getGetOwnerLinkAnalyticsUseCase() {
    return new GetOwnerLinkAnalyticsUseCase(
      this.analyticsOwnerDailyRepository,
      this.inquiryRepository
    );
  }

  getListNotificationsUseCase() {
    return new ListNotificationsUseCase(
      this.notificationRepository,
      this.inquiryRepository,
      this.petRepository,
      this.trackedLinkRepository
    );
  }

  getUnreadNotificationCountUseCase() {
    return new GetUnreadNotificationCountUseCase(this.notificationRepository);
  }

  getUpdateNotificationUseCase() {
    return new UpdateNotificationUseCase(this.notificationRepository);
  }

  getNotificationPreferencesUseCase() {
    return new GetNotificationPreferencesUseCase(this.notificationRepository);
  }

  getPutNotificationPreferenceUseCase() {
    return new PutNotificationPreferenceUseCase(this.notificationRepository);
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
