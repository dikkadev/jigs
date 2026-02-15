"""Client connection and session management for [JIG_NAME].

This module handles all connection logic. Scripts should never interact
with transport/protocol details directly — they use the Client returned
by `connect()`.
"""
from __future__ import annotations

from .types import ConnectOptions, DeviceInfo, DeviceState, ToggleResult
from .errors import ConnectionError, DeviceNotFoundError


class Device:
    """Handle for interacting with a single device.

    Obtained via `Client.device(id)`. Provides typed operations
    on the device.

    Example:
        ```python
        client = await connect()
        light = client.device("living_room_light")
        result = await light.toggle()
        print(f"Light is now {result.new_state.value}")
        ```
    """

    def __init__(self, device_id: str, client: Client) -> None:
        self._id = device_id
        self._client = client

    @property
    def id(self) -> str:
        return self._id

    async def toggle(self) -> ToggleResult:
        """Toggle the device's power state (on→off or off→on).

        Returns:
            ToggleResult with previous and new state.

        Raises:
            DeviceNotFoundError: If this device ID doesn't exist.
            ConnectionError: If the system is unreachable.

        Example:
            ```python
            result = await device.toggle()
            print(f"Was {result.previous_state.value}, now {result.new_state.value}")
            ```
        """
        # TODO: Implement against real backend
        raise NotImplementedError("Replace with real implementation")


class Client:
    """Connection to the [DOMAIN] system.

    Created via `connect()`. Provides access to all domain operations.
    Do not instantiate directly.

    Example:
        ```python
        client = await connect()
        devices = await client.list_devices()
        for d in devices:
            print(f"{d.name}: {d.state.value}")
        ```
    """

    def __init__(self) -> None:
        # Internal connection state
        pass

    async def list_devices(self) -> list[DeviceInfo]:
        """List all available devices.

        Returns a list of DeviceInfo with current state. Use this to
        discover device IDs for other operations.

        Returns:
            List of all known devices with their current state.

        Example:
            ```python
            devices = await client.list_devices()
            for d in devices:
                print(f"{d.id}: {d.name} ({d.state.value})")
            ```
        """
        raise NotImplementedError("Replace with real implementation")

    def device(self, device_id: str) -> Device:
        """Get a handle for a specific device by ID.

        The returned Device object provides typed operations. Use
        `list_devices()` to find available IDs.

        Args:
            device_id: The device identifier string.

        Returns:
            A Device handle for the specified device.

        Example:
            ```python
            light = client.device("kitchen_light")
            await light.toggle()
            ```
        """
        return Device(device_id, self)

    async def close(self) -> None:
        """Close the connection and release resources."""
        pass


async def connect(options: ConnectOptions | None = None) -> Client:
    """Connect to the [DOMAIN] system.

    Configuration is resolved in priority order:
    1. Explicit options passed here
    2. Environment variables (MY_JIG_HOST, MY_JIG_PORT, MY_JIG_TOKEN)
    3. Config file (~/.my-jig/config.toml)
    4. Localhost defaults

    Args:
        options: Optional connection configuration. If None, uses auto-discovery.

    Returns:
        A connected Client ready for use.

    Raises:
        ConnectionError: If the system cannot be reached.

    Example:
        ```python
        # Auto-discover (most common)
        client = await connect()

        # Explicit configuration
        client = await connect(ConnectOptions(host="192.168.1.100", port=8080))
        ```
    """
    # TODO: Implement real connection logic
    return Client()
