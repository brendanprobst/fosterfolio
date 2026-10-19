import { randomUUID } from 'crypto';
import { RollupRowVerifier } from '@api/application/analytics/verifyRollupRows';
import { User } from '@api/domain/entities/User';
import type { AnalyticsDailyWrite } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { AnalyticsOwnerDailyWrite } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

function user(id: string, deletedAt: Date | null = null): User {
  return new User({
    id,
    email: `${id}@example.com`,
    handle: null,
    displayName: 'Owner',
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
    deletedAt,
  });
}

function petRow(overrides: Partial<AnalyticsDailyWrite>): AnalyticsDailyWrite {
  return {
    petId: '',
    linkId: null,
    channelKey: 'direct',
    city: 'Austin',
    day: '2026-10-08',
    views: 3,
    approxVisitors: 3,
    formOpens: 1,
    ...overrides,
  };
}

function ownerRow(overrides: Partial<AnalyticsOwnerDailyWrite>): AnalyticsOwnerDailyWrite {
  return {
    ownerId: '',
    linkId: null,
    channelKey: 'direct',
    city: 'Austin',
    day: '2026-10-08',
    views: 3,
    approxVisitors: 3,
    petTaps: 1,
    ...overrides,
  };
}

describe('RollupRowVerifier', () => {
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  let pets: InMemoryPetRepository;
  let users: InMemoryUserRepository;
  let links: InMemoryTrackedLinkRepository;
  let verifier: RollupRowVerifier;
  let petId: string;
  let siblingPetId: string;
  let otherPetId: string;
  let fosterMeLinkId: string;
  let siblingPetLinkId: string;
  let otherOwnerLinkId: string;

  beforeEach(async () => {
    pets = new InMemoryPetRepository();
    users = new InMemoryUserRepository();
    links = new InMemoryTrackedLinkRepository();
    verifier = new RollupRowVerifier(pets, users, links);
    users.seed(user(ownerId));
    users.seed(user(otherOwnerId));

    petId = (await pets.create({ ownerId, name: 'Mochi', species: 'dog' })).id;
    siblingPetId = (await pets.create({ ownerId, name: 'Bean', species: 'cat' })).id;
    otherPetId = (await pets.create({ ownerId: otherOwnerId, name: 'Rex', species: 'dog' })).id;

    fosterMeLinkId = (
      await links.create({
        target: 'foster_me',
        petId: null,
        ownerId,
        code: 'AAAAAAAA',
        channelKey: 'vet-office',
        channelName: 'Vet office',
        label: null,
      })
    ).id;
    siblingPetLinkId = (
      await links.create({
        target: 'pet',
        petId: siblingPetId,
        ownerId,
        code: 'BBBBBBBB',
        channelKey: 'lawn_sign',
        channelName: 'Lawn sign',
        label: null,
      })
    ).id;
    otherOwnerLinkId = (
      await links.create({
        target: 'foster_me',
        petId: null,
        ownerId: otherOwnerId,
        code: 'CCCCCCCC',
        channelKey: 'dog-park',
        channelName: 'Dog park',
        label: null,
      })
    ).id;
  });

  it('keeps rows whose pet, owner, link and channel all check out', async () => {
    const petRows = [
      petRow({ petId, channelKey: 'direct' }),
      petRow({ petId, channelKey: 'search' }),
      petRow({ petId, channelKey: 'instagram' }),
      petRow({ petId, linkId: fosterMeLinkId, channelKey: 'vet-office' }),
      // First touch on one pet's link follows the visitor to the owner's other pets.
      petRow({ petId, linkId: siblingPetLinkId, channelKey: 'lawn_sign' }),
    ];
    const ownerRows = [
      ownerRow({ ownerId, channelKey: 'direct' }),
      ownerRow({ ownerId, linkId: fosterMeLinkId, channelKey: 'vet-office' }),
    ];

    const verified = await verifier.verify({ petRows, ownerRows });

    expect(verified.petRows).toEqual(petRows);
    expect(verified.ownerRows).toEqual(ownerRows);
    expect(verified.skipped).toEqual({});
  });

  it('drops forged pet rows and counts each reason', async () => {
    const deletedPet = await pets.create({ ownerId, name: 'Gone', species: 'dog' });
    deletedPet.softDelete();
    const valid = petRow({ petId });

    const verified = await verifier.verify({
      petRows: [
        valid,
        petRow({ petId: 'not-a-uuid' }),
        petRow({ petId: "x),or=(id.not.is.null" }),
        petRow({ petId, linkId: 'not-a-uuid' }),
        petRow({ petId: randomUUID() }),
        petRow({ petId: deletedPet.id }),
        petRow({ petId, linkId: otherOwnerLinkId, channelKey: 'dog-park' }),
        petRow({ petId, linkId: randomUUID() }),
        // Another owner's custom channel, without the link.
        petRow({ petId, channelKey: 'dog-park' }),
        petRow({ petId, channelKey: 'forged' }),
        petRow({ petId: otherPetId, linkId: fosterMeLinkId, channelKey: 'vet-office' }),
      ],
      ownerRows: [],
    });

    expect(verified.petRows).toEqual([valid]);
    expect(verified.skipped).toEqual({
      malformed: 3,
      unknown_pet: 2,
      foreign_link: 3,
      unknown_channel: 2,
    });
  });

  it('drops forged owner rows', async () => {
    const deletedOwnerId = randomUUID();
    users.seed(user(deletedOwnerId, new Date()));
    const valid = ownerRow({ ownerId });

    const verified = await verifier.verify({
      petRows: [],
      ownerRows: [
        valid,
        ownerRow({ ownerId: 'owner-1' }),
        ownerRow({ ownerId: randomUUID() }),
        ownerRow({ ownerId: deletedOwnerId }),
        ownerRow({ ownerId, linkId: otherOwnerLinkId, channelKey: 'dog-park' }),
        ownerRow({ ownerId, channelKey: 'forged' }),
      ],
    });

    expect(verified.ownerRows).toEqual([valid]);
    expect(verified.skipped).toEqual({
      malformed: 1,
      unknown_owner: 2,
      foreign_link: 1,
      unknown_channel: 1,
    });
  });
});
