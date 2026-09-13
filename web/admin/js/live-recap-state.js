// Pure lifecycle rules for the Live recap dialog. Only the immutable Show
// transition is non-dismissable; reads and Hide may finish after the dialog is
// closed and must then be ignored.
export function openRecapDialog(state) {
  const previous = state && typeof state === "object" ? state : {};
  return { open: true, generation: (previous.generation || 0) + 1, confirmation: false, showing: false };
}

export function canCloseRecapDialog(state) {
  return !(state && state.showing === true);
}

export function closeRecapDialog(state) {
  if (!canCloseRecapDialog(state)) {
    return state;
  }
  const previous = state && typeof state === "object" ? state : {};
  return {
    open: false,
    generation: (previous.generation || 0) + 1,
    confirmation: false,
    showing: false,
  };
}

export function beginRecapShow(state) {
  if (!state || !state.open || state.showing) {
    return state;
  }
  return Object.assign({}, state, { showing: true });
}

export function resolveRecapShowConflict(state) {
  return Object.assign({}, state, { showing: false, confirmation: false, resubmit: false });
}

export function cancelRecapConfirmation(state) {
  return Object.assign({}, state, { confirmation: false, request: null });
}

export function canApplyRecapDialogResult(state, requestGeneration) {
  return Boolean(state && state.open && state.generation === requestGeneration);
}

export function canApplyRecapRead(state, requestGeneration) {
  return canApplyRecapDialogResult(state, requestGeneration);
}
