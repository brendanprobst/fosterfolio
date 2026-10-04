import type {
  CountResult,
  DataAdapter,
  DataAdapterOptions,
} from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type SupabaseAdapterConfig = {
  url: string;
  serviceRoleKey: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getConfig(): SupabaseAdapterConfig {
  return {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

/** Parse PostgREST Content-Range (e.g. 0-9/123 or star-total forms). */
export function parseContentRangeCount(header: string | null): number | null {
  if (!header) return null;
  const match = header.trim().match(/\/(\d+|\*)\s*$/);
  if (!match || match[1] === '*') return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export class SupabaseAdapter implements DataAdapter {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config = getConfig()) {
    this.url = config.url;
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async get<T>(path: string): Promise<T> {
    return this.requestJson<T>(path, 'GET');
  }

  async post<T>(path: string, body?: unknown, options: DataAdapterOptions = {}): Promise<T> {
    return this.requestJson<T>(path, 'POST', body, options);
  }

  async update<T>(path: string, body?: unknown, options: DataAdapterOptions = {}): Promise<T> {
    return this.requestJson<T>(path, 'PATCH', body, options);
  }

  async delete<T>(path: string): Promise<T> {
    return this.requestJson<T>(path, 'DELETE');
  }

  async getWithCount<T>(path: string, options: DataAdapterOptions = {}): Promise<CountResult<T>> {
    const response = await this.request(path, 'GET', undefined, {
      headers: {
        Prefer: 'count=exact',
        ...(options.headers ?? {}),
      },
    });
    const data = await this.parseBody<T>(response);
    return {
      data,
      count: parseContentRangeCount(response.headers.get('content-range')),
    };
  }

  async rpc<T>(functionName: string, args: Record<string, unknown> = {}): Promise<T> {
    const name = functionName.replace(/^\/+/, '').replace(/^rpc\//, '');
    return this.requestJson<T>(`rpc/${name}`, 'POST', args);
  }

  async insertReturning<T>(
    path: string,
    body?: unknown,
    options: DataAdapterOptions = {}
  ): Promise<T> {
    return this.requestJson<T>(path, 'POST', body, {
      headers: {
        Prefer: 'return=representation',
        ...(options.headers ?? {}),
      },
    });
  }

  private async requestJson<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
    options: DataAdapterOptions = {}
  ): Promise<T> {
    const response = await this.request(path, method, body, options);
    return this.parseBody<T>(response);
  }

  private async request(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
    options: DataAdapterOptions = {}
  ): Promise<Response> {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase request failed (${response.status}): ${text}`);
    }

    return response;
  }

  private async parseBody<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return [] as T;
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      // PostgREST can return 201 with empty body when Prefer: return=minimal is used.
      return [] as T;
    }

    return JSON.parse(responseText) as T;
  }
}
