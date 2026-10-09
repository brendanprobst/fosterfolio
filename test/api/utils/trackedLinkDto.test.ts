import {
  normalizeTrackedLinkLabel,
  toTrackedLinkDto,
} from '@api/application/dtos/trackedLink';
import type { TrackedLinkRecord } from '@api/domain/repositories/ITrackedLinkRepository';

const record: TrackedLinkRecord = {
  id: 'link-1',
  petId: 'pet-1',
  ownerId: 'owner-1',
  code: 'Ab12Cd34',
  channelKey: 'instagram',
  channelName: 'Instagram',
  label: 'porch',
  archivedAt: null,
  createdAt: '2026-10-08T12:00:00.000Z',
};

describe('tracked link dto', () => {
  it('copies the record and defaults views and inquiries to 0', () => {
    expect(toTrackedLinkDto(record)).toEqual({
      id: 'link-1',
      petId: 'pet-1',
      ownerId: 'owner-1',
      code: 'Ab12Cd34',
      channelKey: 'instagram',
      channelName: 'Instagram',
      label: 'porch',
      archivedAt: null,
      createdAt: '2026-10-08T12:00:00.000Z',
      views: 0,
      inquiries: 0,
    });
  });

  it('uses totals when the list passes them in', () => {
    expect(toTrackedLinkDto(record, { views: 12, inquiries: 3 })).toMatchObject({
      views: 12,
      inquiries: 3,
    });
  });

  it('trims a label and turns blank into null', () => {
    expect(normalizeTrackedLinkLabel('  porch flyer  ')).toBe('porch flyer');
    expect(normalizeTrackedLinkLabel('   ')).toBeNull();
    expect(normalizeTrackedLinkLabel('')).toBeNull();
    expect(normalizeTrackedLinkLabel(null)).toBeNull();
    expect(normalizeTrackedLinkLabel(undefined)).toBeNull();
  });
});
