import { CHANNEL_NAME_MAX_LENGTH, CHANNEL_PRESETS } from '@api/domain/channels/channelPresets';
import { CreateOwnerLinkUseCase } from '@api/application/use-cases/CreateOwnerLinkUseCase';
import { CreateTrackedLinkUseCase } from '@api/application/use-cases/CreateTrackedLinkUseCase';
import { ListChannelsUseCase } from '@api/application/use-cases/ListChannelsUseCase';
import { ListOwnerLinksUseCase } from '@api/application/use-cases/ListOwnerLinksUseCase';
import { ListTrackedLinksUseCase } from '@api/application/use-cases/ListTrackedLinksUseCase';
import { ResolveTrackedLinkUseCase } from '@api/application/use-cases/ResolveTrackedLinkUseCase';
import { UpdateTrackedLinkUseCase } from '@api/application/use-cases/UpdateTrackedLinkUseCase';
import { TrackedLink } from '@api/domain/entities/TrackedLink';
import { TRACKED_LINK_LABEL_MAX_LENGTH } from '@api/domain/trackedLinks/trackedLinkLabel';
import { User } from '@api/domain/entities/User';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';
import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

const CODE_PATTERN = /^[A-Za-z0-9]{8}$/;

async function seedPet(pets: InMemoryPetRepository, ownerId: string) {
  return pets.create({ ownerId, name: 'Mochi', species: 'dog' });
}

describe('tracked link use cases', () => {
  let pets: InMemoryPetRepository;
  let links: InMemoryTrackedLinkRepository;
  let createLink: CreateTrackedLinkUseCase;
  let listLinks: ListTrackedLinksUseCase;
  let updateLink: UpdateTrackedLinkUseCase;
  let resolveLink: ResolveTrackedLinkUseCase;
  let listChannels: ListChannelsUseCase;

  beforeEach(() => {
    pets = new InMemoryPetRepository();
    links = new InMemoryTrackedLinkRepository();
    createLink = new CreateTrackedLinkUseCase(links, pets);
    listLinks = new ListTrackedLinksUseCase(links, pets);
    updateLink = new UpdateTrackedLinkUseCase(links);
    resolveLink = new ResolveTrackedLinkUseCase(links);
    listChannels = new ListChannelsUseCase(links);
  });

  describe('create', () => {
    it('rejects a missing channel or pet id', async () => {
      const missingChannel = await createLink.execute('owner-1', 'pet-1', {});
      expect(missingChannel.isFailure()).toBe(true);
      expect(missingChannel.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');

      const missingPetId = await createLink.execute('owner-1', '   ', {
        channelKey: 'instagram',
      });
      expect(missingPetId.isFailure()).toBe(true);
      expect(missingPetId.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
    });

    it('rejects an unknown pet', async () => {
      const result = await createLink.execute('owner-1', 'missing-pet', {
        channelKey: 'instagram',
      });
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('PET_NOT_FOUND');
    });

    it('rejects a non-owner', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const result = await createLink.execute('someone-else', pet.id, {
        channelKey: 'flyer',
      });
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_FORBIDDEN');
    });

    it('returns a code and a normalized label for the owner', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const result = await createLink.execute('owner-1', pet.id, {
        channelName: '  Next Door  ',
        label: '  porch  ',
      });

      expect(result.isFailure()).toBe(false);
      const dto = result.getValue();
      expect(dto.code).toMatch(CODE_PATTERN);
      expect(dto.label).toBe('porch');
      expect(dto.petId).toBe(pet.id);
      expect(dto.ownerId).toBe('owner-1');
      expect(dto.channelKey).toBe('next-door');
      expect(dto.channelName).toBe('Next Door');
      expect(dto.views).toBe(0);
      expect(dto.inquiries).toBe(0);
      expect(dto.archivedAt).toBeNull();
    });
  });

  describe('list', () => {
    it('rejects a non-owner', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const result = await listLinks.execute('someone-else', pet.id);
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_FORBIDDEN');
    });

    it('returns every link for the pet, including archived', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const active = await createLink.execute('owner-1', pet.id, {
        channelKey: 'instagram',
        label: 'story',
      });
      const archived = await createLink.execute('owner-1', pet.id, {
        channelKey: 'flyer',
        label: 'mailbox',
      });
      expect(active.isFailure()).toBe(false);
      expect(archived.isFailure()).toBe(false);

      const archivedUpdate = await updateLink.execute('owner-1', archived.getValue().id, {
        archived: true,
      });
      expect(archivedUpdate.isFailure()).toBe(false);

      const listed = await listLinks.execute('owner-1', pet.id);
      expect(listed.isFailure()).toBe(false);
      const rows = listed.getValue();
      expect(rows.map((row) => row.id).sort()).toEqual(
        [active.getValue().id, archived.getValue().id].sort()
      );
      expect(rows.find((row) => row.id === archived.getValue().id)?.archivedAt).toEqual(
        expect.any(String)
      );
    });
  });

  describe('update', () => {
    it('rejects an empty patch', async () => {
      const result = await updateLink.execute('owner-1', 'link-1', {});
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
    });

    it('rejects a non-owner', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const created = await createLink.execute('owner-1', pet.id, { channelKey: 'flyer' });
      expect(created.isFailure()).toBe(false);

      const result = await updateLink.execute('someone-else', created.getValue().id, {
        label: 'nope',
      });
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_FORBIDDEN');
    });

    it('rejects a missing link', async () => {
      const result = await updateLink.execute('owner-1', 'missing-link', { archived: true });
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_NOT_FOUND');
    });

    it('sets archivedAt, keeps it on a second archive, and clears it when unarchived', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const created = await createLink.execute('owner-1', pet.id, { channelKey: 'lawn_sign' });
      expect(created.isFailure()).toBe(false);
      const linkId = created.getValue().id;

      const first = await updateLink.execute('owner-1', linkId, { archived: true });
      expect(first.isFailure()).toBe(false);
      const archivedAt = first.getValue().archivedAt;
      expect(archivedAt).toEqual(expect.any(String));

      const second = await updateLink.execute('owner-1', linkId, { archived: true });
      expect(second.isFailure()).toBe(false);
      expect(second.getValue().archivedAt).toBe(archivedAt);

      const restored = await updateLink.execute('owner-1', linkId, { archived: false });
      expect(restored.isFailure()).toBe(false);
      expect(restored.getValue().archivedAt).toBeNull();
    });
  });

  describe('resolve', () => {
    it('rejects a blank or unknown code', async () => {
      const blank = await resolveLink.execute('   ');
      expect(blank.isFailure()).toBe(true);
      expect(blank.getError().code).toBe('TRACKED_LINK_NOT_FOUND');

      const unknown = await resolveLink.execute('no-such');
      expect(unknown.isFailure()).toBe(true);
      expect(unknown.getError().code).toBe('TRACKED_LINK_NOT_FOUND');
    });

    it('returns linkId, channelKey, target and petId (never ownerId) for an archived code', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const created = await createLink.execute('owner-1', pet.id, { channelKey: 'facebook' });
      expect(created.isFailure()).toBe(false);
      const archived = await updateLink.execute('owner-1', created.getValue().id, {
        archived: true,
      });
      expect(archived.isFailure()).toBe(false);

      const resolved = await resolveLink.execute(created.getValue().code);
      expect(resolved.isFailure()).toBe(false);
      expect(resolved.getValue()).toEqual({
        linkId: created.getValue().id,
        channelKey: 'facebook',
        target: 'pet',
        petId: pet.id,
      });
    });
  });

  describe('list channels', () => {
    it('lists presets first, then this owner’s custom channels including archived', async () => {
      const ownerPet = await seedPet(pets, 'owner-1');
      const otherPet = await seedPet(pets, 'owner-2');

      const activeCustom = await createLink.execute('owner-1', ownerPet.id, {
        channelName: 'Nextdoor',
      });
      const archivedCustom = await createLink.execute('owner-1', ownerPet.id, {
        channelName: 'Community board',
      });
      const otherOwner = await createLink.execute('owner-2', otherPet.id, {
        channelName: 'Secret group',
      });
      expect(activeCustom.isFailure()).toBe(false);
      expect(archivedCustom.isFailure()).toBe(false);
      expect(otherOwner.isFailure()).toBe(false);

      const archived = await updateLink.execute('owner-1', archivedCustom.getValue().id, {
        archived: true,
      });
      expect(archived.isFailure()).toBe(false);

      const result = await listChannels.execute('owner-1');
      expect(result.isFailure()).toBe(false);
      const channels = result.getValue();

      expect(channels.slice(0, CHANNEL_PRESETS.length)).toEqual(
        CHANNEL_PRESETS.map((preset) => ({
          key: preset.key,
          name: preset.name,
          isPreset: true,
        }))
      );
      expect(channels.slice(CHANNEL_PRESETS.length)).toEqual([
        { key: 'nextdoor', name: 'Nextdoor', isPreset: false },
        { key: 'community-board', name: 'Community board', isPreset: false },
      ]);
      expect(channels.some((channel) => channel.key === 'secret-group')).toBe(false);
    });

    it('lists one entry per key and keeps the most recent display name', async () => {
      const pet = await seedPet(pets, 'owner-1');
      for (const channelName of ['Vet Office', 'vet office', 'Vet Office!']) {
        const created = await createLink.execute('owner-1', pet.id, { channelName });
        expect(created.isFailure()).toBe(false);
        expect(created.getValue().channelKey).toBe('vet-office');
      }

      const result = await listChannels.execute('owner-1');
      expect(result.getValue().slice(CHANNEL_PRESETS.length)).toEqual([
        { key: 'vet-office', name: 'Vet Office!', isPreset: false },
      ]);
    });

    it('leaves stored system keys out of the picker', async () => {
      for (const channelKey of ['direct', 'search']) {
        await links.create({
          target: 'pet',
          petId: 'pet-1',
          ownerId: 'owner-1',
          code: `LEGACY${channelKey.slice(0, 2).toUpperCase()}`,
          channelKey,
          channelName: channelKey,
          label: null,
        });
      }

      const result = await listChannels.execute('owner-1');
      expect(result.getValue().slice(CHANNEL_PRESETS.length)).toEqual([]);
    });

    it('leaves the reserved default channel out of the picker', async () => {
      const users = new InMemoryUserRepository();
      users.seed(ownerUser('owner-1', 'Alex Foster'));
      const createOwner = new CreateOwnerLinkUseCase(links, users);
      const created = await createOwner.execute('owner-1', { isDefault: true });
      expect(created.isFailure()).toBe(false);

      const result = await listChannels.execute('owner-1');
      expect(result.getValue().some((channel) => channel.key === 'default')).toBe(false);
    });
  });

  describe('owner links', () => {
    function ownerLinks() {
      const users = new InMemoryUserRepository();
      users.seed(ownerUser('owner-1', 'Alex Foster'));
      return {
        createOwner: new CreateOwnerLinkUseCase(links, users),
        listOwner: new ListOwnerLinksUseCase(links, pets),
      };
    }

    it('rejects a foster-me link that names a pet and a pet link with no pet', () => {
      expect(TrackedLink.create('foster_me', 'pet-1')).toBeNull();
      expect(TrackedLink.create('pet', null)).toBeNull();
      expect(TrackedLink.create('foster_me', null)?.target).toBe('foster_me');
    });

    it('creates a foster-me link and resolves it with a null pet id', async () => {
      const { createOwner } = ownerLinks();
      const created = await createOwner.execute('owner-1', {
        channelKey: 'instagram',
        label: 'lawn',
      });
      expect(created.isFailure()).toBe(false);
      const dto = created.getValue();
      expect(dto.target).toBe('foster_me');
      expect(dto.petId).toBeNull();

      const resolved = await resolveLink.execute(dto.code);
      expect(resolved.getValue()).toEqual({
        linkId: dto.id,
        channelKey: 'instagram',
        target: 'foster_me',
        petId: null,
      });
    });

    it('rejects default as user-typed channel input', async () => {
      const { createOwner } = ownerLinks();
      const result = await createOwner.execute('owner-1', { channelKey: 'default' });
      expect(result.isFailure()).toBe(true);
      expect(result.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
    });

    it('allows one active default per owner and names it from the display name', async () => {
      const { createOwner } = ownerLinks();
      const first = await createOwner.execute('owner-1', { isDefault: true });
      expect(first.isFailure()).toBe(false);
      expect(first.getValue()).toMatchObject({
        target: 'foster_me',
        petId: null,
        channelKey: 'default',
        channelName: 'Default',
        label: "Alex Foster's default link",
      });

      const second = await createOwner.execute('owner-1', { isDefault: true });
      expect(second.isFailure()).toBe(true);
      expect(second.getError().code).toBe('TRACKED_LINK_DEFAULT_EXISTS');
      expect(second.getError().status).toBe(409);

      const archived = await updateLink.execute('owner-1', first.getValue().id, { archived: true });
      expect(archived.isFailure()).toBe(false);
      const again = await createOwner.execute('owner-1', { isDefault: true });
      expect(again.isFailure()).toBe(false);
    });

    it('lists pet and foster-me links together, with the pet name only on pet links', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const { createOwner, listOwner } = ownerLinks();
      const petLink = await createLink.execute('owner-1', pet.id, { channelKey: 'flyer' });
      const fosterLink = await createOwner.execute('owner-1', { channelName: 'Nextdoor' });
      expect(petLink.isFailure()).toBe(false);
      expect(fosterLink.isFailure()).toBe(false);

      const archived = await updateLink.execute('owner-1', fosterLink.getValue().id, {
        archived: true,
      });
      expect(archived.isFailure()).toBe(false);

      const listed = await listOwner.execute('owner-1');
      expect(listed.isFailure()).toBe(false);
      const rows = listed.getValue();
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.id === petLink.getValue().id)).toMatchObject({
        target: 'pet',
        petId: pet.id,
        petName: 'Mochi',
      });
      expect(rows.find((row) => row.id === fosterLink.getValue().id)).toMatchObject({
        target: 'foster_me',
        petId: null,
        petName: null,
        archivedAt: expect.any(String),
      });
    });

    it('refuses to change target on patch', async () => {
      const { createOwner } = ownerLinks();
      const created = await createOwner.execute('owner-1', { channelKey: 'flyer' });
      expect(created.isFailure()).toBe(false);
      const patched = await updateLink.execute('owner-1', created.getValue().id, {
        label: 'still foster-me',
        target: 'pet',
      });
      expect(patched.isFailure()).toBe(true);
      expect(patched.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
    });
  });

  describe('input bounds', () => {
    const longName = 'v'.repeat(CHANNEL_NAME_MAX_LENGTH + 1);
    const label = (length: number) => 'l'.repeat(length);

    function createOwnerLink() {
      const users = new InMemoryUserRepository();
      users.seed(ownerUser('owner-1', 'Alex Foster'));
      return new CreateOwnerLinkUseCase(links, users);
    }

    it('caps labels at TRACKED_LINK_LABEL_MAX_LENGTH characters after trimming', async () => {
      expect(TRACKED_LINK_LABEL_MAX_LENGTH).toBe(100);
      const pet = await seedPet(pets, 'owner-1');
      const createOwner = createOwnerLink();

      const petAtLimit = await createLink.execute('owner-1', pet.id, {
        channelKey: 'flyer',
        label: `  ${label(100)}  `,
      });
      expect(petAtLimit.getValue().label).toBe(label(100));
      const ownerAtLimit = await createOwner.execute('owner-1', {
        channelKey: 'flyer',
        label: label(100),
      });
      expect(ownerAtLimit.getValue().label).toBe(label(100));

      const results = [
        await createLink.execute('owner-1', pet.id, { channelKey: 'flyer', label: label(101) }),
        await createOwner.execute('owner-1', { channelKey: 'flyer', label: label(101) }),
        await updateLink.execute('owner-1', ownerAtLimit.getValue().id, { label: label(101) }),
        await updateLink.execute('owner-1', ownerAtLimit.getValue().id, {
          label: label(100_000),
        }),
      ];
      for (const result of results) {
        expect(result.isFailure()).toBe(true);
        expect(result.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
      }
      expect((await links.findById(ownerAtLimit.getValue().id))?.label).toBe(label(100));
    });

    it('rejects a custom channel name over the limit on create and update', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const createOwner = createOwnerLink();
      const existing = await createOwner.execute('owner-1', { channelKey: 'flyer' });

      const results = [
        await createLink.execute('owner-1', pet.id, { channelName: longName }),
        await createOwner.execute('owner-1', { channelName: longName }),
        await updateLink.execute('owner-1', existing.getValue().id, { channelName: longName }),
      ];
      for (const result of results) {
        expect(result.isFailure()).toBe(true);
        expect(result.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
      }
      expect((await links.findById(existing.getValue().id))?.channelKey).toBe('flyer');
    });

    it('rejects non-string channel input with 400 instead of throwing', async () => {
      const pet = await seedPet(pets, 'owner-1');
      const createOwner = createOwnerLink();
      const existing = await createOwner.execute('owner-1', { channelKey: 'flyer' });
      const bad = { channelName: 42 as unknown as string };

      const results = [
        await createLink.execute('owner-1', pet.id, bad),
        await createOwner.execute('owner-1', bad),
        await updateLink.execute('owner-1', existing.getValue().id, bad),
      ];
      for (const result of results) {
        expect(result.isFailure()).toBe(true);
        expect(result.getError().code).toBe('TRACKED_LINK_INVALID_INPUT');
      }
    });

    it('shortens a long display name so the default label still fits', async () => {
      const users = new InMemoryUserRepository();
      users.seed(ownerUser('owner-1', 'A'.repeat(500)));
      const createOwner = new CreateOwnerLinkUseCase(links, users);

      const created = await createOwner.execute('owner-1', { isDefault: true });
      expect(created.isFailure()).toBe(false);
      const stored = created.getValue().label ?? '';
      expect(Array.from(stored).length).toBeLessThanOrEqual(TRACKED_LINK_LABEL_MAX_LENGTH);
      expect(stored).toMatch(/^A+…'s default link$/);
    });
  });
});

function ownerUser(id: string, displayName: string): User {
  return new User({
    id,
    email: `${id}@example.com`,
    handle: null,
    displayName,
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
}
