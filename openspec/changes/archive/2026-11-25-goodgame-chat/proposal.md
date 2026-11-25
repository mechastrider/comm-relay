## Why

Streamers simulcasting on GoodGame need public chat alongside their other channels in CommRelay.

## What Changes

Add an opt-in, guest-only GoodGame connection configured by channel name or page URL in Settings. Publish incoming messages to the existing chat bus and expose connection health in diagnostics.

## Capabilities

### New Capabilities

- `goodgame-chat` covers public stream resolution, live subscriptions, recovery and operator settings.

## Impact

The shared Go runtime connects directly to GoodGame from the server or desktop application. No new dependency or account is required.
