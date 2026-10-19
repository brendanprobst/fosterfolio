import { Pet } from '@api/domain/entities/Pet';
import { Post } from '@api/domain/entities/Post';
import { User } from '@api/domain/entities/User';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IPostRepository } from '@api/domain/repositories/IPostRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryPostRepository } from '@api/infrastructure/repositories/InMemoryPostRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';
import { Logger } from '@api/utils/logger';

/**
 * Fixture ids for Playwright (`LATTICE_E2E=1`).
 * Keep field values aligned with `test/web/e2e/support/e2eSeedConstants.ts`.
 */
export const E2E_SEED = {
  userId: 'e2e-playwright-user',
  userEmail: 'e2e-playwright@example.com',
  userDisplayName: 'Alex Foster',
  petId: '11111111-1111-1111-1111-111111111111',
  petName: 'Mochi',
  generalPostBody: 'Hello from the foster feed',
  petUpdateBody: 'Mochi learned a new trick today.',
} as const;

export function isE2eSeedEnabled(): boolean {
  const raw = process.env.LATTICE_E2E?.trim();
  return raw === '1' || raw?.toLowerCase() === 'true';
}

export function seedFosterfolioE2eData(input: {
  userRepository: IUserRepository;
  petRepository: IPetRepository;
  postRepository: IPostRepository;
}): boolean {
  const { userRepository, petRepository, postRepository } = input;
  if (
    !(userRepository instanceof InMemoryUserRepository) ||
    !(petRepository instanceof InMemoryPetRepository) ||
    !(postRepository instanceof InMemoryPostRepository)
  ) {
    return false;
  }

  const now = new Date('2026-08-01T12:00:00.000Z');
  const user = new User({
    id: E2E_SEED.userId,
    email: E2E_SEED.userEmail,
    handle: null,
    displayName: E2E_SEED.userDisplayName,
    avatarUrl: null,
    bio: 'Foster parent in the Playwright seed.',
    zipCode: '94107',
    city: 'San Francisco',
    state: 'CA',
    lat: 37.76,
    lng: -122.39,
    socialLinks: [],
    sheltersText: JSON.stringify([{ name: "SFACC", url: "https://www.sfacc.example" }]),
    createdAt: now,
    deletedAt: null,
  });
  userRepository.seed(user, 2);

  const pet = new Pet({
    id: E2E_SEED.petId,
    ownerId: E2E_SEED.userId,
    name: E2E_SEED.petName,
    species: 'dog',
    breed: 'mutt',
    ageValue: 2,
    ageUnit: 'years',
    sex: 'male',
    size: 'medium',
    status: 'actively_fostering',
    subStatus: null,
    shelterLinkName: null,
    shelterLinkUrl: null,
    primaryPhotoUrl: null,
    photos: [],
    bioMarkdown: 'A very good boy from the E2E seed.',
    importantLinks: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    analyticsStoppedAt: null,
  });
  petRepository.seed(pet, [
    {
      id: '33333333-3333-3333-3333-333333333333',
      bodyText: E2E_SEED.petUpdateBody,
      imageUrl: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ]);

  postRepository.seed(
    new Post({
      id: '44444444-4444-4444-4444-444444444444',
      authorId: E2E_SEED.userId,
      postType: 'general',
      petId: null,
      bodyText: E2E_SEED.generalPostBody,
      imageUrl: null,
      geoLock: 'local',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  );
  postRepository.seed(
    new Post({
      id: '55555555-5555-5555-5555-555555555555',
      authorId: E2E_SEED.userId,
      postType: 'pet_update',
      petId: E2E_SEED.petId,
      bodyText: E2E_SEED.petUpdateBody,
      imageUrl: null,
      geoLock: 'local',
      createdAt: new Date(now.getTime() + 60_000),
      updatedAt: new Date(now.getTime() + 60_000),
      deletedAt: null,
    }),
    { name: E2E_SEED.petName, primaryPhotoUrl: null }
  );

  Logger.warning('[e2e] Seeded in-memory Fosterfolio fixtures (LATTICE_E2E).');
  return true;
}
