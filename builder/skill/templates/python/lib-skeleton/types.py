"""Domain types for [JIG_NAME].

Every type here should have a docstring explaining what it represents
and when/why you'd encounter it. The AI agent reads these to understand
the domain model.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


# ── Enums ──────────────────────────────────────────────────

class DeviceState(Enum):
    """Current power state of a device."""
    ON = "on"
    OFF = "off"
    UNKNOWN = "unknown"


# ── Result types ───────────────────────────────────────────

@dataclass(frozen=True)
class ToggleResult:
    """Result of toggling a device's power state.

    Returned by `Device.toggle()`. Contains both the previous and new state
    so scripts can verify the change happened as expected.
    """
    device_id: str
    previous_state: DeviceState
    new_state: DeviceState


@dataclass(frozen=True)
class DeviceInfo:
    """Summary information about a device.

    Returned by `Client.list_devices()` and `Client.device()`.
    """
    id: str
    name: str
    state: DeviceState
    device_type: str


# ── Configuration ──────────────────────────────────────────

@dataclass
class ConnectOptions:
    """Options for connecting to the system.

    All fields are optional. If not provided, the client attempts
    auto-discovery in this order:
    1. Environment variables (MY_JIG_HOST, MY_JIG_PORT)
    2. Config file (~/.my-jig/config.toml)
    3. Localhost defaults
    """
    host: str | None = None
    port: int | None = None
    token: str | None = None
