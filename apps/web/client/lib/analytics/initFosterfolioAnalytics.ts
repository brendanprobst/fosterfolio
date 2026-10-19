"use client";

import { getPublicApiBaseUrl } from "@client/lib/publicApiBaseUrl";
import {
  consumeMarkFromUrl,
  ensureAttribution,
  hasEntityMark,
  init,
  readStoredAttribution,
  track,
  type Attribution,
} from "@lattice/analytics";
import { isPostHogAnalyticsConfigured } from "./analyticsEnv";

const SOURCE_KEY = "ff_source";
const VIA_FOSTER_ME_KEY = "via_foster_me";

let started = false;

function parseTrackedLinkResolve(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.linkId !== "string" || typeof row.channelKey !== "string") return null;
  return {
    linkId: row.linkId,
    channelKey: row.channelKey,
    targetId: typeof row.petId === "string" ? row.petId : null,
  };
}

/**
 * One PostHog client for the app, plus session attribution even when PostHog is off.
 * Ad blockers block PostHog for a meaningful share of visitors.
 * Follow-up: proxy ingestion through a CloudFront path on our own domain.
 */
export function initFosterfolioAnalytics(): void {
  if (started) return;
  started = true;
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim();
  init({
    ...(isPostHogAnalyticsConfigured() && token
      ? {
          posthog: {
            token,
            apiHost:
              process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
          },
        }
      : {}),
    attribution: {
      queryParam: "s",
      storageKey: SOURCE_KEY,
      resolveUrl: (code) =>
        `${getPublicApiBaseUrl()}/links/resolve/${encodeURIComponent(code)}`,
      parseResolve: parseTrackedLinkResolve,
    },
  });
}

export function readFosterfolioSource(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    return readStoredAttribution(window.sessionStorage, SOURCE_KEY);
  } catch {
    return null;
  }
}

export function consumeViaFosterMe(petId: string): boolean {
  return consumeMarkFromUrl({
    param: "via",
    value: "foster-me",
    key: VIA_FOSTER_ME_KEY,
    id: petId,
  });
}

export function petReachedViaFosterMe(petId: string): boolean {
  return hasEntityMark(VIA_FOSTER_ME_KEY, petId);
}

export async function capturePetEvent(
  event: "pet_viewed" | "inquiry_form_opened" | "inquiry_submitted",
  pet: { id: string; ownerId: string },
): Promise<void> {
  const source = await ensureAttribution();
  const linkMatches = !source.targetId || source.targetId === pet.id;
  track(event, {
    pet_id: pet.id,
    owner_id: pet.ownerId,
    link_id: linkMatches ? source.linkId : null,
    channel_key: source.channelKey,
    referrer_domain: source.referrerDomain,
    via_foster_me: petReachedViaFosterMe(pet.id),
  });
}

export async function captureFosterMeViewed(input: {
  ownerId: string;
  petCount: number;
}): Promise<void> {
  if (input.petCount <= 0) return;
  const source = await ensureAttribution();
  track("foster_me_viewed", {
    owner_id: input.ownerId,
    link_id: source.linkId,
    channel_key: source.channelKey || "direct",
    referrer_domain: source.referrerDomain,
    pet_count: input.petCount,
  });
}
