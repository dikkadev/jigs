/**
 * Client connection and session management for [JIG_NAME].
 *
 * This module handles all connection logic. Scripts should never interact
 * with transport/protocol details directly — they use the Client returned
 * by `connect()`.
 */

import type { ConnectOptions, DeviceInfo, ToggleResult } from "./types";
import { DeviceNotFoundError, ConnectionError } from "./errors";

/**
 * Handle for interacting with a single device.
 *
 * Obtained via `Client.device(id)`. Provides typed operations on the device.
 *
 * @example
 * ```typescript
 * const client = await connect();
 * const light = client.device("living_room_light");
 * const result = await light.toggle();
 * console.log(`Light is now ${result.newState}`);
 * ```
 */
export class Device {
  constructor(
    public readonly id: string,
    private client: Client,
  ) {}

  /**
   * Toggle the device's power state (on→off or off→on).
   *
   * @returns ToggleResult with previous and new state.
   * @throws {DeviceNotFoundError} If this device ID doesn't exist.
   * @throws {ConnectionError} If the system is unreachable.
   *
   * @example
   * ```typescript
   * const result = await device.toggle();
   * console.log(`Was ${result.previousState}, now ${result.newState}`);
   * ```
   */
  async toggle(): Promise<ToggleResult> {
    // TODO: Implement against real backend
    throw new Error("Replace with real implementation");
  }
}

/**
 * Connection to the [DOMAIN] system.
 *
 * Created via `connect()`. Provides access to all domain operations.
 * Do not instantiate directly.
 *
 * @example
 * ```typescript
 * const client = await connect();
 * const devices = await client.listDevices();
 * for (const d of devices) {
 *   console.log(`${d.name}: ${d.state}`);
 * }
 * ```
 */
export class Client {
  /** @internal */
  constructor() {
    // Internal connection state
  }

  /**
   * List all available devices.
   *
   * Returns a list of DeviceInfo with current state. Use this to
   * discover device IDs for other operations.
   *
   * @returns List of all known devices with their current state.
   *
   * @example
   * ```typescript
   * const devices = await client.listDevices();
   * for (const d of devices) {
   *   console.log(`${d.id}: ${d.name} (${d.state})`);
   * }
   * ```
   */
  async listDevices(): Promise<DeviceInfo[]> {
    throw new Error("Replace with real implementation");
  }

  /**
   * Get a handle for a specific device by ID.
   *
   * The returned Device object provides typed operations. Use
   * `listDevices()` to find available IDs.
   *
   * @param deviceId - The device identifier string.
   * @returns A Device handle for the specified device.
   *
   * @example
   * ```typescript
   * const light = client.device("kitchen_light");
   * await light.toggle();
   * ```
   */
  device(deviceId: string): Device {
    return new Device(deviceId, this);
  }

  /** Close the connection and release resources. */
  async close(): Promise<void> {
    // Cleanup
  }
}

/**
 * Connect to the [DOMAIN] system.
 *
 * Configuration is resolved in priority order:
 * 1. Explicit options passed here
 * 2. Environment variables (MY_JIG_HOST, MY_JIG_PORT, MY_JIG_TOKEN)
 * 3. Config file (~/.my-jig/config.json)
 * 4. Localhost defaults
 *
 * @param options - Optional connection configuration. If omitted, uses auto-discovery.
 * @returns A connected Client ready for use.
 * @throws {ConnectionError} If the system cannot be reached.
 *
 * @example Auto-discover (most common)
 * ```typescript
 * const client = await connect();
 * ```
 *
 * @example Explicit configuration
 * ```typescript
 * const client = await connect({ host: "192.168.1.100", port: 8080 });
 * ```
 */
export async function connect(options?: ConnectOptions): Promise<Client> {
  // TODO: Implement real connection logic
  return new Client();
}
