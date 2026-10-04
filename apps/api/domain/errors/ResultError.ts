/**
 * ResultError - Domain entity representing an error with a code, message, and HTTP status.
 */
export class ResultError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status: number = 500,
    public readonly metadata?: Record<string, unknown>
  ) {}

  /**
   * Creates a ResultError.
   *
   * Overloads kept for call-site ergonomics:
   * - `create(code, message)` → status 500
   * - `create(code, message, status)`
   * - `create(code, message, metadata)` → status 500 (legacy)
   * - `create(code, message, status, metadata)`
   */
  static create(
    code: string,
    message: string,
    statusOrMetadata: number | Record<string, unknown> = 500,
    metadata?: Record<string, unknown>
  ): ResultError {
    if (typeof statusOrMetadata === 'object' && statusOrMetadata !== null) {
      return new ResultError(code, message, 500, statusOrMetadata);
    }
    return new ResultError(code, message, statusOrMetadata, metadata);
  }

  /**
   * Formats the message with provided values
   */
  formatMessage(values: Record<string, string | number>): string {
    let formatted = this.message;
    for (const [key, value] of Object.entries(values)) {
      const token = `{${key}}`;
      formatted = formatted.split(token).join(String(value));
    }
    return formatted;
  }

  /**
   * Creates a copy with updated metadata (preserves status)
   */
  withMetadata(metadata: Record<string, unknown>): ResultError {
    return new ResultError(this.code, this.message, this.status, {
      ...this.metadata,
      ...metadata,
    });
  }

  /**
   * Converts to primitives for serialization
   */
  toPrimitives(): {
    code: string;
    message: string;
    status: number;
    metadata?: Record<string, unknown>;
  } {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}
