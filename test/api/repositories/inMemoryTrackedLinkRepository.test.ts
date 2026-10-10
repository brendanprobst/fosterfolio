import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';
import type { CreateTrackedLinkInput } from '@api/domain/repositories/ITrackedLinkRepository';

function input(overrides: Partial<CreateTrackedLinkInput> = {}): CreateTrackedLinkInput {
  return {
    target: 'pet',
    petId: 'pet-1',
    ownerId: 'owner-1',
    code: 'Ab12Cd34',
    channelKey: 'instagram',
    channelName: 'Instagram',
    label: 'story',
    ...overrides,
  };
}

describe('InMemoryTrackedLinkRepository', () => {
  it('round-trips create, findByCode, listByPetId, and update', async () => {
    const repo = new InMemoryTrackedLinkRepository();
    const created = await repo.create(input());

    expect(created.id).toEqual(expect.any(String));
    expect(created.archivedAt).toBeNull();
    expect(created.createdAt).toEqual(expect.any(String));
    expect(await repo.findByCode('Ab12Cd34')).toEqual(created);

    const otherPet = await repo.create(
      input({ petId: 'pet-2', code: 'Zz98Yy76', label: 'other' })
    );
    const listed = await repo.listByPetId('pet-1');
    expect(listed).toEqual([created]);
    expect(listed).not.toContainEqual(otherPet);

    const updated = await repo.update(created.id, {
      channelKey: 'flyer',
      channelName: 'Flyer',
      label: 'mailbox',
      archivedAt: '2026-10-08T15:00:00.000Z',
    });
    expect(updated).toMatchObject({
      id: created.id,
      code: 'Ab12Cd34',
      channelKey: 'flyer',
      channelName: 'Flyer',
      label: 'mailbox',
      archivedAt: '2026-10-08T15:00:00.000Z',
    });
    expect(await repo.findByCode('Ab12Cd34')).toEqual(updated);
    expect(await repo.listByPetId('pet-1')).toEqual([updated]);
  });

  it('lists channel pairs for the owner, including archived links', async () => {
    const repo = new InMemoryTrackedLinkRepository();
    await repo.create(input({ code: 'Active01', channelKey: 'nextdoor', channelName: 'Nextdoor' }));
    const archived = await repo.create(
      input({
        code: 'Archiv02',
        channelKey: 'board',
        channelName: 'Community board',
      })
    );
    await repo.update(archived.id, { archivedAt: '2026-10-08T15:00:00.000Z' });
    await repo.create(
      input({
        ownerId: 'owner-2',
        code: 'Other003',
        channelKey: 'secret',
        channelName: 'Secret group',
      })
    );

    expect(await repo.listChannelPairsByOwner('owner-1')).toEqual([
      { channelKey: 'nextdoor', channelName: 'Nextdoor' },
      { channelKey: 'board', channelName: 'Community board' },
    ]);
    expect(await repo.listChannelPairsByOwner('owner-2')).toEqual([
      { channelKey: 'secret', channelName: 'Secret group' },
    ]);
  });
});
