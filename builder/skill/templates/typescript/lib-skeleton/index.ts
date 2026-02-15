/**
 * [JIG_NAME] — AI-scriptable jig for [DOMAIN].
 *
 * Quick start:
 * ```typescript
 * import { connect } from "./src";
 *
 * const client = await connect();
 * const devices = await client.listDevices();
 * ```
 *
 * See docs/GUIDE.md for usage patterns and docs/API.md for full reference.
 */

// Client
export { connect, Client, Device } from "./client";

// Types
export type {
  ConnectOptions,
  DeviceInfo,
  ToggleResult,
} from "./types";
export { DeviceState } from "./types";

// Errors
export {
  JigError,
  ConnectionError,
  DeviceNotFoundError,
  ValidationError,
} from "./errors";
