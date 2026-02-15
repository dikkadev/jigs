"""[JIG_NAME] — AI-scriptable jig for [DOMAIN].

Quick start:
    ```python
    from my_jig import connect

    client = await connect()
    devices = await client.list_devices()
    ```

See docs/GUIDE.md for usage patterns and docs/API.md for full reference.
"""
from .client import Client, Device, connect
from .errors import (
    ConnectionError,
    DeviceNotFoundError,
    JigError,
    ValidationError,
)
from .types import ConnectOptions, DeviceInfo, DeviceState, ToggleResult

__all__ = [
    # Client
    "connect",
    "Client",
    "Device",
    # Types
    "ConnectOptions",
    "DeviceInfo",
    "DeviceState",
    "ToggleResult",
    # Errors
    "JigError",
    "ConnectionError",
    "DeviceNotFoundError",
    "ValidationError",
]
