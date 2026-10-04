import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createAmmo, createLevelBadge } from "../../shared/viewer-visual-status.js";
import { createViewerStatusClient } from "../../shared/viewer-status-client.js";
import { overlayViewFromConfig, leaderboardViewFromConfig } from "../../overlay/overlay-settings.js";

test("magazines distinguish exhausted, unavailable and large capacities without unbounded DOM", () => {
  const dom = new JSDOM();
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    assert.equal(createAmmo("like", { capacity: 0, remaining: 0 }), null);
    assert.equal(createAmmo("buff", undefined), null);
    const small = createAmmo("like", { capacity: 8, remaining: 2 });
    assert.equal(small.querySelectorAll(".viewer-ammo__round").length, 8);
    assert.equal(small.querySelectorAll(".viewer-ammo__round--loaded").length, 2);
    const empty = createAmmo("buff", { capacity: 5, remaining: 0 });
    assert.match(empty.textContent, /0 \/ 5/);
    for (const capacity of [9, 100]) {
      const large = createAmmo("like", { capacity, remaining: 1 });
      assert.equal(large.querySelectorAll(".viewer-ammo__round").length, 0);
      assert.equal(large.querySelectorAll("svg").length, 2);
      assert.equal(large.textContent, "1 / " + capacity);
    }
    const badge = createLevelBadge({ title: "<script>unsafe</script>", emblem: "unknown" });
    assert.equal(badge.querySelectorAll("script").length, 0);
    assert.ok(badge.classList.contains("viewer-level-badge--shield"));
  } finally {
    globalThis.document = previous;
    dom.window.close();
  }
});

test("missing switches enable visuals; false and unsaved preview choices remain independent", () => {
  const params = new URLSearchParams();
  const config = { overlay: { presets: [{ id: "default", surfaces: { chat: { show_command_ammo: false }, leaderboard: { show_level_badges: false } } }], active_preset_id: "default" } };
  assert.equal(overlayViewFromConfig({}, params).show_command_ammo, true);
  assert.equal(overlayViewFromConfig(config, params).show_level_badges, true);
  assert.equal(overlayViewFromConfig(config, params).show_command_ammo, false);
  assert.equal(leaderboardViewFromConfig(config, params).show_level_badges, false);
  assert.equal(overlayViewFromConfig(config, new URLSearchParams("preview=sample&show_command_ammo=1&show_level_badges=0")).show_command_ammo, true);
  assert.equal(overlayViewFromConfig(config, new URLSearchParams("preview=sample&show_level_badges=0")).show_level_badges, false);
});

test("status requests deduplicate identities, bound batches, clear failed state and stop", async () => {
  const requests = [];
  let fail = false;
  let receive;
  const received = () => new Promise(resolve => { receive = resolve; });
  const identities = Array.from({ length: 101 }, (_, i) => ({ platform: "twitch", user_id: String(i) }));
  const client = createViewerStatusClient({
    identities: () => [...identities, identities[0]],
    receive: (states) => receive(states),
    fetcher: async (_url, options) => {
      const batch = JSON.parse(options.body).identities;
      requests.push(batch);
      if (fail) return { ok: false };
      return { ok: true, json: async () => ({ statuses: batch.map(identity => ({ ...identity, like: { remaining: 1, capacity: 5 } })) }) };
    },
  });
  try {
    let next = received();
    client.schedule();
    assert.equal((await next).size, 101);
    assert.deepEqual(requests.map(batch => batch.length), [100, 1]);
    fail = true;
    next = received();
    client.schedule();
    assert.equal((await next).size, 0);
  } finally { client.stop(); }
});
