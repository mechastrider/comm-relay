export const MAX_CONTRACT_TITLE_CODE_POINTS = 80;
export const MAX_CONTRACT_OBJECTIVE_CODE_POINTS = 280;

export function codePointLength(value) {
  return Array.from(typeof value === "string" ? value.trim() : "").length;
}

/** Normalizes a draft and keeps client validation aligned with the API contract. */
export function validateViewerContractDraft(draft) {
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const objective = typeof draft.objective === "string" ? draft.objective.trim() : "";
  const rewardID = typeof draft.rewardID === "string" ? draft.rewardID.trim() : "";
  return {
    title,
    objective,
    rewardID,
    titleValid: title !== "" && codePointLength(title) <= MAX_CONTRACT_TITLE_CODE_POINTS,
    objectiveValid:
      objective !== "" && codePointLength(objective) <= MAX_CONTRACT_OBJECTIVE_CODE_POINTS,
    rewardValid: rewardID !== "",
  };
}
