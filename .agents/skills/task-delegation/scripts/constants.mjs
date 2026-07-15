export const SCHEMA_VERSION = 1;
export const PINNED_MODEL = 'composer-2.5';
export const STATE_APP = 'agent-orchestration';
export const RESULT_WATCHDOG_MS = 5_000;
export const KILL_GRACE_MS = 3_000;
export const DEFAULT_TIMEOUT_SECONDS = 1800;
export const MALFORMED_LOCK_TTL_MS = 30_000;

export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMED_OUT: 'timed_out',
  SPAWN_FAILED: 'spawn_failed',
  INTERRUPTED: 'interrupted',
};

export const TERMINAL_STATUSES = new Set([
  JOB_STATUS.COMPLETED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELLED,
  JOB_STATUS.TIMED_OUT,
  JOB_STATUS.SPAWN_FAILED,
  JOB_STATUS.INTERRUPTED,
]);
