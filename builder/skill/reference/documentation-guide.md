# Documentation Guide

How to write documentation that AI coding agents can actually use to write correct scripts.

---

## Why This Matters

An AI agent discovers your jig through its documentation. It reads docs to understand what's available, what patterns to follow, and what constraints exist. If the docs are incomplete, vague, or wrong, the AI writes broken scripts. Documentation quality is the #1 predictor of jig usability.

---

## Two Layers, Both Required

### Layer 1: In-Code Documentation

Every public function, method, class, and type must have docstrings that explain:
- **What** it does (one sentence)
- **When/why** you'd use it (one sentence)
- **Parameters** with descriptions and constraints
- **Return value** with what it contains
- **At least one example** showing real usage

#### Python (Google-style docstrings)

```python
async def set_brightness(self, device_id: str, brightness: int) -> BrightnessResult:
    """Set the brightness of a light device.

    Brightness is a percentage (0–100). Values outside this range are clamped.
    The change applies immediately unless the device is mid-transition,
    in which case it queues.

    Args:
        device_id: The device identifier. Find available IDs via `list_devices()`.
        brightness: Target brightness, 0 (off) to 100 (full).

    Returns:
        BrightnessResult with the confirmed new state, including previous value.

    Raises:
        DeviceNotFoundError: If device_id doesn't match a known device.
        DeviceOfflineError: If the device isn't reachable.

    Example:
        ```python
        result = await lights.set_brightness("living_room", 75)
        print(f"Changed from {result.previous} to {result.current}")
        ```

    Example — gradual dim:
        ```python
        for level in [80, 60, 40, 20]:
            await lights.set_brightness("bedroom", level)
            await asyncio.sleep(1)
        ```
    """
```

#### TypeScript (JSDoc / TSDoc)

```typescript
/**
 * Sets the brightness of a light device.
 *
 * Brightness is specified as a percentage (0-100). Values are clamped.
 * The change is applied immediately unless the device is in a scene
 * transition, in which case it queues.
 *
 * @param deviceId - The device identifier (find via `listDevices()`)
 * @param brightness - Target brightness, 0 (off) to 100 (full)
 * @returns The confirmed new brightness state, including previous value
 * @throws {DeviceNotFoundError} If deviceId doesn't match a known device
 * @throws {DeviceOfflineError} If the device isn't reachable
 *
 * @example
 * ```typescript
 * const result = await lights.setBrightness("living_room", 75);
 * console.log(`Changed from ${result.previous} to ${result.current}`);
 * ```
 *
 * @example Gradual dim
 * ```typescript
 * for (const level of [80, 60, 40, 20]) {
 *   await lights.setBrightness("bedroom", level);
 *   await sleep(1000);
 * }
 * ```
 */
```

### Layer 2: Standalone Documentation Files

These live in `docs/` and provide narrative context the AI reads to understand the big picture.

#### GUIDE.md — The Mental Model

The first thing an agent reads. Explains how the library works conceptually:
- What the domain is, in 2-3 sentences
- The core abstractions (client, devices, scenes, etc.) and how they relate
- The typical workflow: connect → discover → act → verify
- Common patterns with short code examples
- What NOT to do (brief anti-patterns)

Keep it under 500 lines. This is a guide, not a reference.

#### API.md — Complete Reference

Every public export with its signature, parameters, return type, and a one-liner description. This can be auto-generated from types/docstrings.

Structure it by module/group:
```markdown
## Client

### `connect(options?: ConnectOptions): Promise<Client>`
Create a connection to the system. See ConnectOptions for configuration.

### `Client.device(id: string): Device`
Get a device handle by ID.

## Device

### `Device.toggle(): Promise<ToggleResult>`
Toggle the device's power state.

...
```

#### EXAMPLES.md — Curated Scripts

5+ real-world script examples. Each example has:
- A comment block explaining what it does and when you'd want it
- The complete, runnable script
- Expected output or behavior

Categories to cover:
1. A simple read-only query (list, status, export)
2. A single write operation
3. A batch/multi-step operation
4. An operation with dry-run demonstrated
5. An error-handling example

#### CONCEPTS.md — Domain Knowledge

Things that aren't obvious from the API:
- State machines (device lifecycle, connection states)
- Timing constraints (rate limits, cooldowns, ordering requirements)
- Event models (push vs. pull, subscriptions)
- Domain jargon (what does "scene" mean in this context?)

---

## Documentation Maintenance

Docs drift from code immediately. Two strategies:

### Strategy A: Generate from source (recommended for API.md)

Write a script that extracts types, function signatures, and docstrings to produce API.md. Run it as part of the build.

### Strategy B: Keep docs co-located (recommended for GUIDE.md, CONCEPTS.md)

Write these by hand (with AI help), but keep them close to the code they describe. Review them whenever the public API changes.

### The Litmus Test

After any library change, ask: "If an AI agent reads only the docs (not the source), can it still write correct scripts?" If not, the docs need updating.

---

## Agent Instruction Files

These are distinct from documentation — they tell the agent how to *behave* in the project, not what the library does.

### CLAUDE.md (Claude Code)

```markdown
# Project: [Name]

## What This Is
[One sentence]

## When Writing Scripts
- Start from `scripts/_template.[ext]`
- Always include --dry-run support
- Import from [library path], never access internals
- Read `docs/GUIDE.md` for patterns, `docs/API.md` for reference
- Check `scripts/examples/` for reference implementations

## When Modifying the Library
- All public functions must have docstrings with examples
- Run [typecheck/build command] after changes
- Regenerate API.md if the public surface changed
- Keep the public API minimal

## Key Patterns
- All operations return typed results
- Errors are typed (use [Base]Error classes)
- Batch operations support .preview() before .execute()
- IDs are always strings
```

### AGENTS.md (generic, for opencode / Cursor / etc.)

Same content as CLAUDE.md but with agent-agnostic language. Some agents read different files — having both costs nothing.
