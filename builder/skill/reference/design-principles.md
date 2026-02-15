# Design Principles

Core design guidance for building AI-scriptable domain jigs.

---

## The Library Does the Hard Work

The library encapsulates all complexity: connections, authentication, protocol handling, retries, error recovery, state management. A script using the library should read almost like pseudocode.

**Bad** — complexity leaks into the script:
```python
import httpx, os, json

token = os.environ["API_TOKEN"]
resp = httpx.post(f"https://api.example.com/devices/switch_1/toggle",
    headers={"Authorization": f"Bearer {token}"},
    timeout=30)
resp.raise_for_status()
result = resp.json()
if result["status"] != "ok":
    raise RuntimeError(f"Toggle failed: {result}")
```

**Good** — the script is intent-level:
```python
from my_jig import connect

home = await connect()
switch = home.device("switch_1")
await switch.toggle()
```

The same principle in TypeScript:
```typescript
import { connect } from "./src";

const home = await connect();
const switch1 = home.device("switch_1");
await switch1.toggle();
```

---

## API Surface: Intent Level, Not Mechanism Level

Expose operations at the *intent* level:

- ✅ `device.turn_on()` — intent is clear
- ✅ `scene.activate(transition="fade", duration=2000)` — options are discoverable
- ❌ `transport.send_raw_command(0x04, payload)` — too low-level for scripts
- ❌ `_state_manager.get_device_cache()` — implementation detail

If someone needs low-level access, provide it through a clearly separate import path (e.g., `from my_jig.internals import ...`), not through the main surface.

### How Many Primitives?

Prefer **few, composable primitives** over a wide "do-everything" API. If the AI needs to call 7 half-overlapping methods to do one thing, the SDK mirrors implementation details instead of intent.

Rule of thumb: if a dream script needs more than 3 imports from the library to do a common task, the surface is probably too granular.

---

## Type Design

### Be Precise

- No `any` (TypeScript) or untyped `dict` (Python) in the public API
- Use enums/literals where a string has known valid values
- Use branded types or newtypes for IDs that shouldn't be mixed up

### Return Typed Results

Every operation must return a typed result. Never `void` / `None` for operations that change state — the AI needs to know what happened.

```python
# Bad
async def toggle(device_id: str) -> None: ...

# Good
@dataclass
class ToggleResult:
    device_id: str
    previous_state: DeviceState
    new_state: DeviceState
    timestamp: datetime

async def toggle(device_id: str) -> ToggleResult: ...
```

```typescript
// Bad
async toggle(deviceId: string): Promise<void>

// Good
interface ToggleResult {
  deviceId: string;
  previousState: DeviceState;
  newState: DeviceState;
  timestamp: Date;
}
async toggle(deviceId: string): Promise<ToggleResult>
```

---

## Validation Strategy

Layer these as appropriate:

### Schema Validation (always implement)

Validate parameters before they hit the underlying system.

**Python** — Pydantic models or manual validation:
```python
from pydantic import BaseModel, Field

class BrightnessInput(BaseModel):
    device_id: str = Field(min_length=1)
    brightness: int = Field(ge=0, le=100)
```

**TypeScript** — Zod or Valibot:
```typescript
import { z } from "zod";

const BrightnessInput = z.object({
  deviceId: z.string().min(1),
  brightness: z.number().min(0).max(100),
});
```

### Dry-Run / Preview (always implement)

The operation computes what it would do and returns a plan without executing.

```python
plan = await batch.preview()
# Plan(actions=[Action(device="light_1", change="brightness 100 → 50"), ...])
print(plan)
await plan.execute()
```

```typescript
const plan = await batch.preview();
// { actions: [{ device: "light_1", change: "brightness 100 → 50" }, ...] }
console.log(plan);
await plan.execute();
```

### Confirmation Prompts (for destructive operations)

Interactive scripts ask before proceeding.

### Transaction / Rollback (domain-dependent)

Only add if the underlying system supports it. Don't fake it.

---

## Error Handling

Scripts should fail clearly and early. The library provides typed errors the AI can anticipate.

### Python
```python
class JigError(Exception):
    """Base error for all jig errors."""

class DeviceNotFoundError(JigError):
    def __init__(self, device_id: str):
        self.device_id = device_id
        super().__init__(f"Device not found: {device_id}")

class ConnectionError(JigError):
    def __init__(self, message: str, *, retryable: bool = False):
        self.retryable = retryable
        super().__init__(message)
```

### TypeScript
```typescript
export class JigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DeviceNotFoundError extends JigError {
  constructor(public deviceId: string) {
    super(`Device not found: ${deviceId}`);
  }
}

export class ConnectionError extends JigError {
  constructor(message: string, public retryable: boolean = false) {
    super(message);
  }
}
```

### Error Design Rules

- Every error has a specific class (not just `Error("something broke")`)
- Errors include the relevant context (the device ID that wasn't found, the URL that timed out)
- Errors indicate whether they're retryable
- The base error class is specific to your jig (not just `Exception` / `Error`)

---

## Configuration Management

Support multiple sources with a clear priority:

1. **Explicit arguments** — `connect(host="...", port=8080)`
2. **Environment variables** — `MY_JIG_HOST`, `MY_JIG_PORT`
3. **Config file** — `./config.json`, `~/.my-jig/config.toml`
4. **Auto-discovery** — mDNS, well-known paths, localhost defaults

The `connect()` call should work with zero arguments in the common case. Document what it tries and in what order.

---

## Idempotency

Document the idempotency strategy for every write operation:

- **Naturally idempotent**: `set_brightness(50)` — calling twice has the same effect
- **Idempotent with key**: `create_scene(name="movie", idempotency_key="...")` — second call is a no-op
- **Not idempotent**: `send_command(...)` — calling twice sends twice. Document this clearly.

Scripts that an AI generates may be run multiple times (testing, retrying after partial failure). Idempotent operations make this safe.

---

## No Side Effects on Import

Importing the library must not:
- Open connections
- Read config files
- Start background threads
- Print anything
- Modify global state

Everything happens explicitly through function calls. This makes scripts predictable and testable.
