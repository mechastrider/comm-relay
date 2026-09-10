import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT_CONTENT,
  LEADERBOARD_CONTENT,
  contractControlState,
  effectiveLeaderboardVisibility,
  normalizeViewerContractState,
} from "./viewer-contract-state.js";

test("normalizes an active contract presentation without trusting extra fields", function () {
  const state = normalizeViewerContractState({
    type: "viewer_contract_state",
    contract: { id: "c-1", title: "Find <loot>", objective: "Mark it", reward_points: 10 },
    content: LEADERBOARD_CONTENT,
    visible: true,
    ignored: "value",
  });
  assert.equal(state.contract.title, "Find <loot>");
  assert.equal(state.content, LEADERBOARD_CONTENT);
  assert.equal(state.visible, true);
});

test("active contract temporarily owns visibility and inactive state restores leaderboard policy", function () {
  const hiddenPolicy = { visible: false };
  const active = normalizeViewerContractState({
    type: "viewer_contract_state", contract: { id: "c-1" }, content: CONTRACT_CONTENT, visible: true,
  });
  assert.deepEqual(effectiveLeaderboardVisibility(active, hiddenPolicy), {
    activeContract: true, visible: true, content: CONTRACT_CONTENT,
  });
  assert.deepEqual(effectiveLeaderboardVisibility({ ...active, content: LEADERBOARD_CONTENT }, hiddenPolicy), {
    activeContract: true, visible: false, content: LEADERBOARD_CONTENT,
  });
  assert.deepEqual(effectiveLeaderboardVisibility({ contract: null }, { visible: true }), {
    activeContract: false, visible: true, content: LEADERBOARD_CONTENT,
  });
  assert.deepEqual(effectiveLeaderboardVisibility({ contract: null }, hiddenPolicy), {
    activeContract: false, visible: false, content: LEADERBOARD_CONTENT,
  });
});

test("normalizes inactive and rejects unrelated or invalid frames", function () {
  assert.deepEqual(normalizeViewerContractState({
    type: "viewer_contract_state", contract: null, content: LEADERBOARD_CONTENT, visible: true,
  }), { contract: null, content: CONTRACT_CONTENT, visible: false });
  assert.equal(normalizeViewerContractState({ type: "message" }), null);
  assert.equal(normalizeViewerContractState({ type: "viewer_contract_state", contract: {} }), null);
});

test("derives accessible pressed and busy states for dock controls", function () {
  const snapshot = normalizeViewerContractState({
    type: "viewer_contract_state",
    contract: { id: "c-1" },
    content: CONTRACT_CONTENT,
    visible: false,
  });
  assert.deepEqual(contractControlState(snapshot, false), {
    active: true,
    disabled: false,
    contractPressed: true,
    leaderboardPressed: false,
    visiblePressed: false,
  });
  assert.equal(contractControlState(snapshot, true).disabled, true);
  assert.equal(contractControlState(null, false).active, false);
});
