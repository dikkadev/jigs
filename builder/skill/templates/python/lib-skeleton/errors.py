"""Typed error classes for [JIG_NAME].

Every error that scripts might encounter should have a specific class here.
Errors include relevant context so scripts can provide useful feedback.
"""
from __future__ import annotations


class JigError(Exception):
    """Base class for all [JIG_NAME] errors.

    Catch this to handle any jig error generically.
    """


class ConnectionError(JigError):
    """Failed to connect to the system.

    Attributes:
        retryable: Whether the connection might succeed if retried.
    """

    def __init__(self, message: str, *, retryable: bool = False) -> None:
        self.retryable = retryable
        super().__init__(message)


class DeviceNotFoundError(JigError):
    """The specified device ID does not exist.

    Attributes:
        device_id: The ID that was not found.

    Tip: Use `client.list_devices()` to see available device IDs.
    """

    def __init__(self, device_id: str) -> None:
        self.device_id = device_id
        super().__init__(f"Device not found: {device_id}")


class ValidationError(JigError):
    """Input parameters failed validation.

    Attributes:
        field: The field that failed validation.
        reason: Why it failed.
    """

    def __init__(self, field: str, reason: str) -> None:
        self.field = field
        self.reason = reason
        super().__init__(f"Validation failed for '{field}': {reason}")
