# Platform Contract

## Supported Matrix

| OS/version | Architecture | Required behavior / exception |
|------------|--------------|-------------------------------|
| Windows supported release targets | Any currently packaged architecture | Wails and external browser preview use the same static assets; OBS CEF is the acceptance runtime |
| macOS supported release targets | Any currently packaged architecture | Same responsive and transparent-page behavior; minor font rasterization differences are acceptable |
| Linux supported release targets | Any currently packaged architecture | Same behavior in supported browsers/OBS packages; installed font availability follows existing fallback stack |

## OS Integration

| Area | Contract | Permissions/sandbox | Failure/recovery |
|------|----------|---------------------|------------------|
| filesystem/dialogs | Existing `config.json` persistence only; no new files or dialogs | Existing user-config access | Invalid additive fields use current config validation/recovery |
| clipboard/notifications | Existing OBS URL copy behavior unchanged | Existing web clipboard fallback | Current fallback remains |
| tray/menu/shortcuts | No change | N/A | N/A |
| protocol/file associations | Existing localhost HTTP URLs unchanged | N/A | Browser Source refresh recovers current layout |
| single instance/deep open | No change | N/A | N/A |
| child processes/IPC | No child process or native IPC | N/A | N/A |
| sleep/wake/shutdown | Page-local observer only; no background native work | Browser lifecycle | Refresh/reconnect recalculates viewport |

## Security / Privacy / Trust Boundary

The surface remains localhost and transparent. User-controlled title and viewer data are rendered as text, not HTML. Query enum/numeric overrides remain allowlisted and bounded. No new external requests, OS permission, analytics, or personal data field is added.

## Not applicable areas

Native window creation, file pickers, notifications, tray/menu commands, global shortcuts, protocol handlers, single-instance behavior, power integration, packaging entitlements, and connector authentication are intentionally unaffected.
