const SUMMARY_MAX_LENGTH = 2000;
const TERMINAL_RESULT_MAX_LENGTH = 2000;

function boundSummary(summary) {
  if (summary == null) return null;
  return String(summary).slice(0, SUMMARY_MAX_LENGTH);
}

function boundTerminalResult(terminalResult) {
  if (!terminalResult) return null;
  const bounded = {
    subtype: terminalResult.subtype ?? null,
    isError: Boolean(terminalResult.isError),
    result: terminalResult.result ?? null,
  };
  if (bounded.result != null) {
    bounded.result = String(bounded.result).slice(0, TERMINAL_RESULT_MAX_LENGTH);
  }
  return bounded;
}

export function toPublicJobView(job) {
  if (!job || typeof job !== 'object') {
    return job;
  }

  return {
    schemaVersion: job.schemaVersion,
    jobId: job.jobId,
    priorJobId: job.priorJobId ?? null,
    taskPath: job.taskPath ?? null,
    taskHash: job.taskHash ?? null,
    mode: job.mode,
    requestedModel: job.requestedModel,
    reportedModel: job.reportedModel ?? null,
    sessionId: job.sessionId ?? null,
    status: job.status,
    background: Boolean(job.background),
    timeoutSeconds: job.timeoutSeconds ?? 0,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    endedAt: job.endedAt ?? null,
    exitCode: job.exitCode ?? null,
    summary: boundSummary(job.summary),
    terminalResult: boundTerminalResult(job.terminalResult),
    postRunChangedPaths: job.postRunChangedPaths ?? [],
    touchedFiles: job.touchedFiles ?? [],
    stdoutLog: job.stdoutLog,
    stderrLog: job.stderrLog,
  };
}
