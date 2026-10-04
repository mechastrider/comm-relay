import { visualIdentityKey } from "./viewer-visual-status.js";

// One in-flight batch, bounded requests and a periodic refresh cover ingest
// ordering, reconnects, linked identities, session resets and operator edits.
export function createViewerStatusClient({ identities, receive, fetcher = fetch }) {
  let stopped = false;
  let running = false;
  let pending = false;
  let timer = null;
  let controller = null;
  async function refresh() {
    if (stopped) return;
    if (running) { pending = true; return; }
    running = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 4000);
    try {
      const unique = new Map();
      for (const identity of identities()) {
        const key = visualIdentityKey(identity);
        if (key) unique.set(key, { platform: identity.platform, user_id: identity.user_id });
      }
      const values = [...unique.values()];
      const statuses = new Map();
      for (let offset = 0; offset < values.length; offset += 100) {
        const response = await fetcher("/api/viewers/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identities: values.slice(offset, offset + 100) }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Viewer status unavailable");
        const data = await response.json();
        if (!Array.isArray(data.statuses)) throw new Error("Invalid viewer status response");
        for (const status of data.statuses) statuses.set(visualIdentityKey(status), status);
      }
      if (!stopped) receive(statuses);
    } catch {
      if (!stopped) receive(new Map());
    } finally {
      clearTimeout(timeout);
      running = false;
      controller = null;
      if (pending && !stopped) { pending = false; schedule(); }
    }
  }
  function schedule() {
    if (stopped || timer !== null) return;
    timer = setTimeout(() => { timer = null; void refresh(); }, 150);
  }
  const interval = setInterval(schedule, 4000);
  return {
    schedule,
    stop() { stopped = true; clearTimeout(timer); clearInterval(interval); controller?.abort(); },
  };
}
