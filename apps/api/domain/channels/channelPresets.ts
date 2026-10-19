/**
 * Preset marketing channels. The API is the only place this list lives.
 * Custom channels slugify their display name into channel_key.
 */
export const CHANNEL_PRESETS = [
  { key: 'lawn_sign', name: 'Lawn sign' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'tiktok', name: 'TikTok' },
  { key: 'flyer', name: 'Flyer' },
] as const;

export type ChannelPresetKey = (typeof CHANNEL_PRESETS)[number]['key'];

/** Reserved for POST /me/links `{ isDefault: true }`. User input cannot pick it. */
export const RESERVED_CHANNEL_KEY = 'default';
export const RESERVED_CHANNEL_NAME = 'Default';

const PRESET_KEYS = new Set<string>(CHANNEL_PRESETS.map((preset) => preset.key));

export function isPresetChannelKey(key: string): boolean {
  return PRESET_KEYS.has(key);
}

/**
 * Keys the browser derives from the referrer when no link code resolved
 * (`@lattice/analytics` referrer map). Instagram, Facebook and TikTok are presets.
 */
export const REFERRER_CHANNEL_KEYS = ['direct', 'search'] as const;

/** Keys a custom channel can never take: they already carry referrer or default-link traffic. */
const RESERVED_KEYS = new Set<string>([...REFERRER_CHANNEL_KEYS, RESERVED_CHANNEL_KEY]);

const SYSTEM_KEYS = new Set<string>([...PRESET_KEYS, ...RESERVED_KEYS]);

/** A preset, referrer or default-link key. None of these is ever an owner's custom channel. */
export function isSystemChannelKey(key: string): boolean {
  return SYSTEM_KEYS.has(key);
}

/**
 * Whether an analytics row may carry this channel key: a preset, a referrer key,
 * the default link's key, or a key on one of the owner's links (archived included).
 * Event properties are client-writable, so anything else is forged or stale.
 */
export function isKnownChannelKey(key: string, ownerChannelKeys: ReadonlySet<string>): boolean {
  return isSystemChannelKey(key) || ownerChannelKeys.has(key);
}

/**
 * Lowercased; every run of characters that isn't a letter or digit becomes one hyphen, and
 * leading/trailing hyphens are dropped. "Vet Office!", "vet office" and "vet  office " match.
 */
export function slugifyChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export type ResolvedChannel = {
  key: string;
  name: string;
  isPreset: boolean;
};

export function resolveChannel(input: {
  channelKey?: string | null | undefined;
  channelName?: string | null | undefined;
}): ResolvedChannel | null {
  const key = input.channelKey?.trim() ?? '';
  const name = input.channelName?.trim() ?? '';
  const slug = slugifyChannelName(name);

  if (RESERVED_KEYS.has(key.toLowerCase()) || RESERVED_KEYS.has(slug)) {
    return null;
  }

  if (key) {
    const preset = CHANNEL_PRESETS.find((item) => item.key === key);
    if (preset) {
      return { key: preset.key, name: preset.name, isPreset: true };
    }
  }

  if (!slug) {
    return null;
  }

  const preset = CHANNEL_PRESETS.find(
    (item) => item.key === slug || slugifyChannelName(item.name) === slug
  );
  if (preset) {
    return { key: preset.key, name: preset.name, isPreset: true };
  }

  return { key: slug, name, isPreset: false };
}
