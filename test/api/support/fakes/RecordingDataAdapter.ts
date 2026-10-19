import type {
  DataAdapter,
  DataAdapterOptions,
} from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

export type RecordedCall = {
  method: 'get' | 'post' | 'update' | 'delete' | 'rpc' | 'insertReturning';
  path: string;
  body?: unknown;
  options?: DataAdapterOptions;
};

/** Records every request. rpc answers with `rpcResult`; everything else returns no rows. */
export class RecordingDataAdapter implements DataAdapter {
  calls: RecordedCall[] = [];
  rpcResult: unknown = [];

  async get<T>(path: string): Promise<T> {
    this.calls.push({ method: 'get', path });
    return [] as T;
  }

  async post<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T> {
    this.calls.push({ method: 'post', path, body, options });
    return [] as T;
  }

  async update<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T> {
    this.calls.push({ method: 'update', path, body, options });
    return [] as T;
  }

  async delete<T>(path: string): Promise<T> {
    this.calls.push({ method: 'delete', path });
    return [] as T;
  }

  async getWithCount<T>(): Promise<{ data: T; count: number | null }> {
    throw new Error('unused');
  }

  async rpc<T>(functionName: string, args?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method: 'rpc', path: functionName, body: args });
    return this.rpcResult as T;
  }

  async insertReturning<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T> {
    this.calls.push({ method: 'insertReturning', path, body, options });
    return [] as T;
  }
}
