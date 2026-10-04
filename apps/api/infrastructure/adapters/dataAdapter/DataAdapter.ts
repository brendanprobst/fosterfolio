export type DataAdapterOptions = {
  headers?: Record<string, string>;
};

/** Rows plus PostgREST exact count (Prefer count=exact + Content-Range). */
export type CountResult<T> = {
  data: T;
  count: number | null;
};

export interface DataAdapter {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T>;
  update<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T>;
  delete<T>(path: string): Promise<T>;

  /**
   * GET with Prefer: count=exact. Parses the Content-Range header into `count`.
   */
  getWithCount<T>(path: string, options?: DataAdapterOptions): Promise<CountResult<T>>;

  /** POST rest/v1/rpc/{functionName} with a JSON argument object. */
  rpc<T>(functionName: string, args?: Record<string, unknown>): Promise<T>;

  /**
   * INSERT (POST) with Prefer: return=representation so the DB-generated
   * row (e.g. uuid PK) is returned in the response body.
   */
  insertReturning<T>(path: string, body?: unknown, options?: DataAdapterOptions): Promise<T>;
}
