/**
 * Domain types for [JIG_NAME].
 *
 * Every type here should have JSDoc explaining what it represents
 * and when/why you'd encounter it. The AI agent reads these to
 * understand the domain model.
 */

// ── Enums ──────────────────────────────────────────────────

/** Current power state of a device. */
export enum DeviceState {
  On = "on",
  Off = "off",
  Unknown = "unknown",
}

// ── Result types ───────────────────────────────────────────

/**
 * Result of toggling a device's power state.
 *
 * Returned by `Device.toggle()`. Contains both the previous and new state
 * so scripts can verify the change happened as expected.
 */
export interface ToggleResult {
  deviceId: string;
  previousState: DeviceState;
  newState: DeviceState;
}

/**
 * Summary information about a device.
 *
 * Returned by `Client.listDevices()` and `Client.device()`.
 */
export interface DeviceInfo {
  id: string;
  name: string;
  state: DeviceState;
  deviceType: string;
}

// ── Configuration ──────────────────────────────────────────

/**
 * Options for connecting to the system.
 *
 * All fields are optional. If not provided, the client attempts
 * auto-discovery in this order:
 * 1. Environment variables (MY_JIG_HOST, MY_JIG_PORT)
 * 2. Config file (~/.my-jig/config.json)
 * 3. Localhost defaults
 */
export interface ConnectOptions {
  host?: string;
  port?: number;
  token?: string;
}
