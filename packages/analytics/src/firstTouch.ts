import { referrerAttribution } from "./referrer";

export type Attribution = {
  linkId: string | null;
  channelKey: string;
  referrerDomain: string | null;
  /** Opaque id from the resolve API (Fosterfolio sends the pet id). */
  targetId: string | null;
};

export type ResolvedLink = {
  linkId: string;
  channelKey: string;
  targetId?: string | null;
};

export function resolveFirstTouch(input: {
  existing: Attribution | null;
  queryCode: string | null;
  referrer: string | null;
  resolvedLink: ResolvedLink | null;
}): Attribution {
  if (input.existing) return input.existing;
  const fromReferrer = referrerAttribution(input.referrer);
  const code = input.queryCode?.trim() ?? "";
  if (code && input.resolvedLink) {
    return {
      linkId: input.resolvedLink.linkId,
      channelKey: input.resolvedLink.channelKey,
      referrerDomain: fromReferrer.referrerDomain,
      targetId: input.resolvedLink.targetId ?? null,
    };
  }
  return {
    linkId: null,
    channelKey: fromReferrer.channelKey,
    referrerDomain: fromReferrer.referrerDomain,
    targetId: null,
  };
}

export function readStoredAttribution(
  storage: { getItem(key: string): string | null },
  key: string,
): Attribution | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    if (!parsed || typeof parsed.channelKey !== "string" || !parsed.channelKey) return null;
    return {
      linkId: typeof parsed.linkId === "string" ? parsed.linkId : null,
      channelKey: parsed.channelKey,
      referrerDomain:
        typeof parsed.referrerDomain === "string" ? parsed.referrerDomain : null,
      targetId: typeof parsed.targetId === "string" ? parsed.targetId : null,
    };
  } catch {
    return null;
  }
}

export function writeStoredAttribution(
  storage: { setItem(key: string, value: string): void },
  key: string,
  value: Attribution,
): void {
  storage.setItem(key, JSON.stringify(value));
}
