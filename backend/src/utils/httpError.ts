/**
 * An error that maps directly to an HTTP response. Throw it from anywhere in a
 * request handler; the central error middleware turns it into `{ error }` JSON.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new HttpError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new HttpError(403, message);
  }
  static notFound(message = "Not found") {
    return new HttpError(404, message);
  }
  static conflict(message: string) {
    return new HttpError(409, message);
  }
}
