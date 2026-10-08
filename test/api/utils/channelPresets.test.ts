import {
  CHANNEL_PRESETS,
  resolveChannel,
  slugifyChannelName,
} from '@api/domain/channels/channelPresets';

describe('channel presets', () => {
  it('keeps a stable preset order', () => {
    expect(CHANNEL_PRESETS.map((preset) => preset.key)).toEqual([
      'lawn_sign',
      'instagram',
      'facebook',
      'tiktok',
      'flyer',
      'shelter_listing',
      'other',
    ]);
    expect(CHANNEL_PRESETS.map((preset) => preset.name)).toEqual([
      'Lawn sign',
      'Instagram',
      'Facebook',
      'TikTok',
      'Flyer',
      'Shelter listing',
      'Other',
    ]);
  });

  it('lets a preset key win and keeps the preset display name', () => {
    expect(
      resolveChannel({ channelKey: 'instagram', channelName: 'My custom IG' })
    ).toEqual({
      key: 'instagram',
      name: 'Instagram',
      isPreset: true,
    });
    expect(resolveChannel({ channelKey: '  tiktok  ' })).toEqual({
      key: 'tiktok',
      name: 'TikTok',
      isPreset: true,
    });
  });

  it('slugifies a custom name', () => {
    expect(slugifyChannelName('  Next   Door\tGroup  ')).toBe('next-door-group');
    expect(resolveChannel({ channelName: '  Next   Door  ' })).toEqual({
      key: 'next-door',
      name: 'Next   Door',
      isPreset: false,
    });
  });

  it('keeps two display names when they slugify to the same key', () => {
    const lower = resolveChannel({ channelName: 'Nextdoor' });
    const upper = resolveChannel({ channelName: 'NEXTDOOR' });

    expect(lower).toEqual({ key: 'nextdoor', name: 'Nextdoor', isPreset: false });
    expect(upper).toEqual({ key: 'nextdoor', name: 'NEXTDOOR', isPreset: false });
    expect(lower?.name).not.toBe(upper?.name);
  });

  it('returns null for empty or unusable input', () => {
    expect(resolveChannel({})).toBeNull();
    expect(resolveChannel({ channelKey: null, channelName: null })).toBeNull();
    expect(resolveChannel({ channelKey: '   ', channelName: '   ' })).toBeNull();
    expect(resolveChannel({ channelName: ' - ' })).toBeNull();
    expect(resolveChannel({ channelName: '-' })).toBeNull();
    expect(resolveChannel({ channelKey: 'not_a_preset' })).toBeNull();
  });
});
