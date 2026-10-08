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
  { key: 'shelter_listing', name: 'Shelter listing' },
  { key: 'other', name: 'Other' },
] as const;

export type ChannelPresetKey = (typeof CHANNEL_PRESETS)[number]['key'];

const PRESET_KEYS = new Set<string>(CHANNEL_PRESETS.map((preset) => preset.key));

export function isPresetChannelKey(key: string): boolean {
  return PRESET_KEYS.has(key);
}

/** Lowercased, trimmed, whitespace runs become a single hyphen. */
export function slugifyChannelName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
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

  if (key) {
    const preset = CHANNEL_PRESETS.find((item) => item.key === key);
    if (preset) {
      return { key: preset.key, name: preset.name, isPreset: true };
    }
  }

  if (!name) {
    return null;
  }

  const presetByName = CHANNEL_PRESETS.find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );
  if (presetByName) {
    return { key: presetByName.key, name: presetByName.name, isPreset: true };
  }

  const slug = slugifyChannelName(name);
  if (!slug || slug === '-') {
    return null;
  }

  const presetBySlug = CHANNEL_PRESETS.find((item) => item.key === slug);
  if (presetBySlug) {
    return { key: presetBySlug.key, name: presetBySlug.name, isPreset: true };
  }

  return { key: slug, name, isPreset: false };
}
