import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { NoopGeoLookupAdapter } from '@api/infrastructure/adapters/geo/NoopGeoLookupAdapter';
import { ZippopotamGeoLookupAdapter } from '@api/infrastructure/adapters/geo/ZippopotamGeoLookupAdapter';
import { createAnalyticsModule } from '@api/infrastructure/composition/analytics';
import { createAllowlistModule } from '@api/infrastructure/composition/allowlist';
import { createInquiriesModule } from '@api/infrastructure/composition/inquiries';
import { createNotificationsModule, createNotificationRepository } from '@api/infrastructure/composition/notifications';
import { createPetsModule } from '@api/infrastructure/composition/pets';
import { createPostsModule } from '@api/infrastructure/composition/posts';
import { createSearchModule } from '@api/infrastructure/composition/search';
import { createStarsModule } from '@api/infrastructure/composition/stars';
import { createStorageModule } from '@api/infrastructure/composition/storage';
import {
  createTrackedLinksModule,
  type LinkTotalsPorts,
} from '@api/infrastructure/composition/trackedLinks';
import { createUsersModule } from '@api/infrastructure/composition/users';
import { isE2eSeedEnabled, seedFosterfolioE2eData } from '@api/infrastructure/e2eSeed';
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
  private readonly notifications: ReturnType<typeof createNotificationsModule>;
  private readonly storage: ReturnType<typeof createStorageModule>;
  private readonly trackedLinks: ReturnType<typeof createTrackedLinksModule>;
  private readonly analytics: ReturnType<typeof createAnalyticsModule>;
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
    const linkTotals: LinkTotalsPorts = {};
    this.trackedLinks = createTrackedLinksModule(
      dataAdapter,
      this.pets.petRepository,
      this.users.userRepository,
      linkTotals
    );
    const notificationRepository = createNotificationRepository(dataAdapter);
    this.inquiries = createInquiriesModule(
      dataAdapter,
      this.users.userRepository,
      this.pets.petRepository,
      this.trackedLinks.trackedLinkRepository,
      notificationRepository
    );
    this.notifications = createNotificationsModule(
      notificationRepository,
      this.inquiries.inquiryRepository,
      this.pets.petRepository,
      this.trackedLinks.trackedLinkRepository
    );
    this.analytics = createAnalyticsModule(
      dataAdapter,
      this.pets.petRepository,
      this.inquiries.inquiryRepository
    );
    linkTotals.analyticsDailyRepository = this.analytics.analyticsDailyRepository;
    linkTotals.inquiryRepository = this.inquiries.inquiryRepository;
    this.storage = createStorageModule(dataAdapter);
    this.allowlist = createAllowlistModule(dataAdapter);

    if (isE2eSeedEnabled()) {
      seedFosterfolioE2eData({
        userRepository: this.users.userRepository,
        petRepository: this.pets.petRepository,
        postRepository: this.posts.postRepository,
      });
    }
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

  getReportInquirySourceUseCase() {
    return this.inquiries.getReportInquirySourceUseCase();
  }

  getSignUploadUseCase() {
    return this.storage.getSignUploadUseCase();
  }

  getCreateTrackedLinkUseCase() {
    return this.trackedLinks.getCreateTrackedLinkUseCase();
  }

  getCreateOwnerLinkUseCase() {
    return this.trackedLinks.getCreateOwnerLinkUseCase();
  }

  getListOwnerLinksUseCase() {
    return this.trackedLinks.getListOwnerLinksUseCase();
  }

  getListTrackedLinksUseCase() {
    return this.trackedLinks.getListTrackedLinksUseCase();
  }

  getUpdateTrackedLinkUseCase() {
    return this.trackedLinks.getUpdateTrackedLinkUseCase();
  }

  getResolveTrackedLinkUseCase() {
    return this.trackedLinks.getResolveTrackedLinkUseCase();
  }

  getListChannelsUseCase() {
    return this.trackedLinks.getListChannelsUseCase();
  }

  getGetPetAnalyticsUseCase() {
    return this.analytics.getGetPetAnalyticsUseCase();
  }

  getGetPetAnalyticsSummaryUseCase() {
    return this.analytics.getGetPetAnalyticsSummaryUseCase();
  }

  getListNotificationsUseCase() {
    return this.notifications.getListNotificationsUseCase();
  }

  getUnreadNotificationCountUseCase() {
    return this.notifications.getUnreadNotificationCountUseCase();
  }

  getUpdateNotificationUseCase() {
    return this.notifications.getUpdateNotificationUseCase();
  }

  getNotificationPreferencesUseCase() {
    return this.notifications.getNotificationPreferencesUseCase();
  }

  getPutNotificationPreferenceUseCase() {
    return this.notifications.getPutNotificationPreferenceUseCase();
  }
}

