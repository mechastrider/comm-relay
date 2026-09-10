export const CONTRACT_CONTENT = "contract";
export const LEADERBOARD_CONTENT = "leaderboard";

export function normalizeViewerContractState(value) {
  if (!value || value.type !== "viewer_contract_state") {
    return null;
  }
  const content = value.content === LEADERBOARD_CONTENT ? LEADERBOARD_CONTENT : CONTRACT_CONTENT;
  if (value.contract == null) {
    return { contract: null, content: CONTRACT_CONTENT, visible: false };
  }
  if (typeof value.contract !== "object" || typeof value.contract.id !== "string" || value.contract.id.trim() === "") {
    return null;
  }
  return {
    contract: {
      id: value.contract.id,
      title: typeof value.contract.title === "string" ? value.contract.title : "",
      objective: typeof value.contract.objective === "string" ? value.contract.objective : "",
      reward_id: typeof value.contract.reward_id === "string" ? value.contract.reward_id : "",
      reward_name: typeof value.contract.reward_name === "string" ? value.contract.reward_name : "",
      reward_points: Number.isFinite(value.contract.reward_points) ? value.contract.reward_points : 0,
      announced_at: typeof value.contract.announced_at === "string" ? value.contract.announced_at : "",
    },
    content: content,
    visible: Boolean(value.visible),
  };
}

export function contractControlState(snapshot, busy) {
  const active = Boolean(snapshot && snapshot.contract);
  const pending = Boolean(busy);
  return {
    active: active,
    disabled: !active || pending,
    contractPressed: active && snapshot.content === CONTRACT_CONTENT,
    leaderboardPressed: active && snapshot.content === LEADERBOARD_CONTENT,
    visiblePressed: active && snapshot.visible,
  };
}

export function effectiveLeaderboardVisibility(contractState, leaderboardVisibility) {
  if (contractState && contractState.contract && contractState.content === CONTRACT_CONTENT) {
    return {
      activeContract: true,
      visible: contractState.visible,
      content: CONTRACT_CONTENT,
    };
  }
  return {
    activeContract: Boolean(contractState && contractState.contract),
    visible: Boolean(leaderboardVisibility && leaderboardVisibility.visible),
    content: LEADERBOARD_CONTENT,
  };
}
