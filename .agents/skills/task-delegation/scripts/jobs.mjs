import { randomUUID } from 'node:crypto';
import { readJson, writeJsonAtomic } from './atomic.mjs';
import {
  ensureDirExists,
  getCurrentJobPath,
  getJobDir,
  getJobRecordPath,
  getRepoJobsDir,
  hashFileContents,
} from './paths.mjs';
import { redactForPersistence } from './redact.mjs';
import { SCHEMA_VERSION, PINNED_MODEL } from './constants.mjs';

export function createJobId(customId) {
  return customId || randomUUID();
}

export function newJobRecord({
  jobId,
  repoRoot,
  repoHash,
  taskPath,
  taskRepoRelative,
  mode,
  background,
  timeoutSeconds,
  argv,
  baselineDirtyPaths,
  baselinePathHashes,
  priorJobId,
}) {
  const now = new Date().toISOString();
  const stdoutLog = getJobStdoutPath(repoRoot, jobId);
  const stderrLog = getJobStderrPath(repoRoot, jobId);
  return {
    schemaVersion: SCHEMA_VERSION,
    jobId,
    priorJobId: priorJobId ?? null,
    repoRoot,
    repoHash,
    taskPath: taskRepoRelative ?? null,
    taskHash: taskPath ? hashFileContents(taskPath) : null,
    mode,
    requestedModel: PINNED_MODEL,
    reportedModel: null,
    sessionId: null,
    status: 'pending',
    background: Boolean(background),
    wrapperPid: process.pid,
    childPid: null,
    startedAt: now,
    updatedAt: now,
    endedAt: null,
    exitCode: null,
    summary: null,
    baselineDirtyPaths,
    baselinePathHashes,
    postRunChangedPaths: [],
    touchedFiles: [],
    stdoutLog,
    stderrLog,
    diagnostics: [],
    timeoutSeconds: timeoutSeconds ?? 0,
    argv,
    cancelRequested: false,
    terminalResult: null,
  };
}

export function writeJob(fs, repoRoot, job) {
  const jobDir = getJobDir(repoRoot, job.jobId);
  ensureDirExists(fs, jobDir);
  const redacted = redactForPersistence(job);
  writeJsonAtomic(fs, getJobRecordPath(repoRoot, job.jobId), redacted);
}

export function readJob(fs, repoRoot, jobId) {
  return readJson(fs, getJobRecordPath(repoRoot, jobId));
}

export function setCurrentJob(fs, repoRoot, jobId) {
  ensureDirExists(fs, getRepoJobsDir(repoRoot));
  writeJsonAtomic(fs, getCurrentJobPath(repoRoot), { jobId });
}

export function getCurrentJobId(fs, repoRoot) {
  const path = getCurrentJobPath(repoRoot);
  if (!fs.existsSync(path)) return null;
  try {
    const data = readJson(fs, path);
    return data.jobId ?? null;
  } catch {
    return null;
  }
}

export function appendDiagnostic(job, entry) {
  job.diagnostics.push({
    at: new Date().toISOString(),
    ...entry,
  });
}

export function getJobStdoutPath(repoRoot, jobId) {
  return `${getJobDir(repoRoot, jobId)}/stdout.ndjson`;
}

export function getJobStderrPath(repoRoot, jobId) {
  return `${getJobDir(repoRoot, jobId)}/stderr.log`;
}

export function listJobIds(fs, repoRoot) {
  const jobsDir = getRepoJobsDir(repoRoot);
  if (!fs.existsSync(jobsDir)) return [];
  return fs.readdirSync(jobsDir).filter((name) => {
    if (name === 'current.json' || name === 'writer.lock') return false;
    const recordPath = getJobRecordPath(repoRoot, name);
    return fs.existsSync(recordPath);
  });
}
