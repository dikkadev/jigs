/**
 * Typed error classes for [JIG_NAME].
 *
 * Every error that scripts might encounter should have a specific class here.
 * Errors include relevant context so scripts can provide useful feedback.
 */

/** Base class for all [JIG_NAME] errors. Catch this to handle any jig error generically. */
export class JigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Failed to connect to the system.
 *
 * Check `retryable` to determine if the connection might succeed if retried.
 */
export class ConnectionError extends JigError {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
  }
}

/**
 * The specified device ID does not exist.
 *
 * Use `client.listDevices()` to see available device IDs.
 */
export class DeviceNotFoundError extends JigError {
  constructor(public readonly deviceId: string) {
    super(`Device not found: ${deviceId}`);
  }
}

/** Input parameters failed validation. */
export class ValidationError extends JigError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Validation failed for '${field}': ${reason}`);
  }
}
