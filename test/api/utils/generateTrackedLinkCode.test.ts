import { generateTrackedLinkCode } from '@api/domain/trackedLinks/generateTrackedLinkCode';

const CODE_PATTERN = /^[A-Za-z0-9]{8}$/;

describe('generateTrackedLinkCode', () => {
  it('returns an 8-character alphanumeric code', () => {
    const first = generateTrackedLinkCode();
    const second = generateTrackedLinkCode();

    expect(first).toMatch(CODE_PATTERN);
    expect(second).toMatch(CODE_PATTERN);
  });
});
