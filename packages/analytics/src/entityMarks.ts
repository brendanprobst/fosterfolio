export type MarkStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type MarkHistory = {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
};

export type MarkLocation = {
  href: string;
  search: string;
  pathname: string;
  hash: string;
};

const PREFIX = "ff_";

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

function readIds(storage: MarkStorage, key: string): string[] {
  const raw = storage.getItem(storageKey(key));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function markEntity(key: string, id: string, storage?: MarkStorage | null): void {
  const trimmedKey = key.trim();
  const trimmedId = id.trim();
  if (!trimmedKey || !trimmedId) return;
  const store = storage ?? browserStorage();
  if (!store) return;
  const ids = readIds(store, trimmedKey);
  if (ids.includes(trimmedId)) return;
  try {
    store.setItem(storageKey(trimmedKey), JSON.stringify([...ids, trimmedId]));
  } catch {
    // Private-mode storage can reject writes.
  }
}

export function hasEntityMark(key: string, id: string, storage?: MarkStorage | null): boolean {
  const trimmedKey = key.trim();
  const trimmedId = id.trim();
  if (!trimmedKey || !trimmedId) return false;
  const store = storage ?? browserStorage();
  if (!store) return false;
  return readIds(store, trimmedKey).includes(trimmedId);
}

/**
 * When the current URL has `param=value`, remember `id` under `key` and
 * remove that query param so a copied address does not keep it.
 */
export function consumeMarkFromUrl(input: {
  param: string;
  value: string;
  key: string;
  id: string;
  storage?: MarkStorage | null;
  location?: MarkLocation;
  history?: MarkHistory;
}): boolean {
  const location = input.location ?? browserLocation();
  if (!location) return false;
  const params = new URLSearchParams(location.search);
  if (params.get(input.param) !== input.value) return false;
  markEntity(input.key, input.id, input.storage);
  params.delete(input.param);
  const history = input.history ?? browserHistory();
  if (history) {
    const query = params.toString();
    const next = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
    history.replaceState(browserHistoryState(), "", next);
  }
  return true;
}

type Browser = {
  sessionStorage: MarkStorage;
  location: MarkLocation;
  history: MarkHistory & { state: unknown };
};

function browser(): Browser | null {
  const scope = globalThis as { window?: Browser };
  return scope.window ?? null;
}

function browserStorage(): MarkStorage | null {
  try {
    return browser()?.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function browserLocation(): MarkLocation | null {
  return browser()?.location ?? null;
}

function browserHistory(): MarkHistory | null {
  return browser()?.history ?? null;
}

function browserHistoryState(): unknown {
  try {
    return browser()?.history.state ?? null;
  } catch {
    return null;
  }
}
