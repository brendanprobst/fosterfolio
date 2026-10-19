import { channelKeyFromHostname } from '@lattice/analytics/server';
import {
  CHANNEL_PRESETS,
  isSystemChannelKey,
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
    ]);
    expect(CHANNEL_PRESETS.map((preset) => preset.name)).toEqual([
      'Lawn sign',
      'Instagram',
      'Facebook',
      'TikTok',
      'Flyer',
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

  it('strips punctuation and collapses hyphens so near-identical names share a key', () => {
    expect(slugifyChannelName('Vet Office!')).toBe('vet-office');
    expect(slugifyChannelName('vet office')).toBe('vet-office');
    expect(slugifyChannelName('vet office ')).toBe('vet-office');
    expect(slugifyChannelName('  --Vet -- Office__ ')).toBe('vet-office');
    expect(slugifyChannelName("Mom's group (FB)")).toBe('mom-s-group-fb');
    expect(slugifyChannelName('Café Crème')).toBe('café-crème');
    expect(slugifyChannelName('!!!')).toBe('');
  });

  it('maps a punctuated preset name onto the preset', () => {
    expect(resolveChannel({ channelName: 'Lawn Sign!' })).toEqual({
      key: 'lawn_sign',
      name: 'Lawn sign',
      isPreset: true,
    });
    expect(resolveChannel({ channelName: 'lawn_sign' })).toEqual({
      key: 'lawn_sign',
      name: 'Lawn sign',
      isPreset: true,
    });
  });

  it.each([
    'default',
    'Default',
    'direct',
    'Direct',
    ' DIRECT ',
    'Direct!',
    'search',
    'Search',
    '-search-',
  ])('reserves the system channel name %p', (channelName) => {
    expect(resolveChannel({ channelName })).toBeNull();
  });

  it.each(['default', 'direct', 'search', 'Search'])(
    'reserves the system channel key %p',
    (channelKey) => {
      expect(resolveChannel({ channelKey, channelName: 'Nextdoor' })).toBeNull();
    }
  );

  it('still allows names that only start with a system key', () => {
    expect(resolveChannel({ channelName: 'Direct mail' })).toEqual({
      key: 'direct-mail',
      name: 'Direct mail',
      isPreset: false,
    });
  });

  it('flags preset, referrer and default keys as system keys', () => {
    for (const key of ['default', 'direct', 'search', 'instagram', 'lawn_sign']) {
      expect(isSystemChannelKey(key)).toBe(true);
    }
    expect(isSystemChannelKey('vet-office')).toBe(false);
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

describe('referrer map drift', () => {
  it('reserves or presets every channel key the referrer map can produce', () => {
    const hosts = [
      '',
      'example.com',
      'www.instagram.com',
      'l.facebook.com',
      'm.facebook.com',
      'www.tiktok.com',
      'www.google.com',
      'google.co.uk',
      'bing.com',
    ];
    for (const host of hosts) {
      expect(isSystemChannelKey(channelKeyFromHostname(host))).toBe(true);
    }
  });
});
