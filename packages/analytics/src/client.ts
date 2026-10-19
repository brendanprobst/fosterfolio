import posthog from "posthog-js";
import {
  readStoredAttribution,
  resolveFirstTouch,
  writeStoredAttribution,
  type Attribution,
  type ResolvedLink,
} from "./firstTouch";

export type AnalyticsConfig = {
  posthog?: {
    token: string;
    apiHost?: string;
  };
  attribution: {
    queryParam: string;
    storageKey: string;
    resolveUrl: (code: string) => string;
    parseResolve?: (body: unknown) => ResolvedLink | null;
  };
  fetch?: typeof fetch;
};

/**
 * Memory only: no localStorage and no cookie. Autocapture, pageviews,
 * pageleave, and session recording stay off. Callers must not identify.
 */
export const POSTHOG_BROWSER_OPTIONS = {
  persistence: "memory" as const,
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_session_recording: true,
};

let config: AnalyticsConfig | null = null;
let didInit = false;
let suppressed = false;
let memory: Attribution | null = null;
let pending: Promise<Attribution> | null = null;
let posthogReady = false;

function defaultParseResolve(body: unknown): ResolvedLink | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.linkId !== "string" || typeof row.channelKey !== "string") return null;
  return {
    linkId: row.linkId,
    channelKey: row.channelKey,
    targetId: typeof row.targetId === "string" ? row.targetId : null,
  };
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function queryCode(): string | null {
  if (!config || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(config.attribution.queryParam);
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

async function lookupCode(code: string): Promise<ResolvedLink | null> {
  if (!config) return null;
  const fetchImpl = config.fetch ?? fetch;
  try {
    const response = await fetchImpl(config.attribution.resolveUrl(code));
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return (config.attribution.parseResolve ?? defaultParseResolve)(body);
  } catch {
    return null;
  }
}

export function init(next: AnalyticsConfig): void {
  if (didInit) return;
  didInit = true;
  config = next;
  const token = next.posthog?.token?.trim();
  if (token && typeof window !== "undefined") {
    // Ad blockers block PostHog for a meaningful share of visitors.
    // Follow-up: proxy ingestion through a CloudFront path on our own domain.
    posthog.init(token, {
      api_host: next.posthog?.apiHost?.trim() || "https://us.i.posthog.com",
      ...POSTHOG_BROWSER_OPTIONS,
    });
    posthogReady = true;
  }
  void ensureAttribution();
}

export function setCaptureSuppressed(nextSuppressed: boolean): void {
  suppressed = nextSuppressed;
}

export function isCaptureSuppressed(): boolean {
  return suppressed;
}

export function readAttribution(): Attribution | null {
  if (memory) return memory;
  if (!config) return null;
  const storage = browserStorage();
  if (!storage) return null;
  return readStoredAttribution(storage, config.attribution.storageKey);
}

export async function ensureAttribution(): Promise<Attribution> {
  if (memory) return memory;
  if (!config) {
    return {
      linkId: null,
      channelKey: "direct",
      referrerDomain: null,
      targetId: null,
    };
  }
  const storage = browserStorage();
  const existing = storage
    ? readStoredAttribution(storage, config.attribution.storageKey)
    : null;
  if (existing) {
    memory = existing;
    return existing;
  }
  if (!pending) {
    pending = (async () => {
      const code = queryCode();
      const resolvedLink = code ? await lookupCode(code) : null;
      const referrer = typeof document === "undefined" ? null : document.referrer;
      const latest = storage
        ? readStoredAttribution(storage, config!.attribution.storageKey)
        : null;
      const next = resolveFirstTouch({
        existing: latest,
        queryCode: code,
        referrer,
        resolvedLink,
      });
      memory = next;
      if (storage && !latest) {
        try {
          writeStoredAttribution(storage, config!.attribution.storageKey, next);
        } catch {
          // Private-mode storage can reject writes. Keep the in-memory source.
        }
      }
      return next;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (suppressed || !posthogReady) return;
  posthog.capture(event, omitContactProps(props));
}

/** Zip codes and email addresses stay out of the analytics client. */
// todo: maybe expand this to other PII fields in the future
function omitContactProps(
  props?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (/email|zip/i.test(key)) continue;
    next[key] = value;
  }
  return next;
}

export function getPostHogBrowserClient(): typeof posthog | null {
  return posthogReady ? posthog : null;
}
