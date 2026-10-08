import { CHANNEL_PRESETS } from '@api/domain/channels/channelPresets';
import { CreateTrackedLinkUseCase } from '@api/application/use-cases/CreateTrackedLinkUseCase';
import { ListChannelsUseCase } from '@api/application/use-cases/ListChannelsUseCase';
import { ListTrackedLinksUseCase } from '@api/application/use-cases/ListTrackedLinksUseCase';
import { ResolveTrackedLinkUseCase } from '@api/application/use-cases/ResolveTrackedLinkUseCase';
import { UpdateTrackedLinkUseCase } from '@api/application/use-cases/UpdateTrackedLinkUseCase';
import { InMemoryPetRepository } from '@api/infrastructure/repositories/InMemoryPetRepository';
import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';

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
      const created = await createLink.execute('owner-1', pet.id, { channelKey: 'other' });
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

    it('returns linkId, channelKey, and petId for an archived code', async () => {
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
  });
});
