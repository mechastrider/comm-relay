export function parseStreamLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { kind: 'empty' };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      kind: 'malformed',
      raw: trimmed,
      error: error.message,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { kind: 'malformed', raw: trimmed, error: 'non-object JSON' };
  }

  const type = parsed.type;
  const subtype = parsed.subtype;

  if (type === 'system' && subtype === 'init') {
    return {
      kind: 'init',
      sessionId: parsed.session_id ?? parsed.sessionId ?? null,
      reportedModel: parsed.model ?? null,
      raw: parsed,
    };
  }

  if (type === 'result') {
    return {
      kind: 'result',
      subtype,
      isError: Boolean(parsed.is_error),
      result: parsed.result ?? null,
      raw: parsed,
    };
  }

  return {
    kind: 'unknown',
    type,
    subtype,
    raw: parsed,
  };
}

export function applyStreamEvent(job, event) {
  if (event.kind === 'init') {
    if (event.sessionId) job.sessionId = event.sessionId;
    if (event.reportedModel) job.reportedModel = event.reportedModel;
    return;
  }
  if (event.kind === 'result') {
    job.terminalResult = {
      subtype: event.subtype,
      isError: event.isError,
      result: event.result,
    };
    if (event.result) {
      job.summary = String(event.result).slice(0, 2000);
    }
    return;
  }
  if (event.kind === 'malformed' || event.kind === 'unknown') {
    job.diagnostics.push({
      at: new Date().toISOString(),
      streamEvent: event.kind,
      type: event.type ?? null,
      subtype: event.subtype ?? null,
      raw: event.raw,
      error: event.error ?? null,
    });
  }
}
