import { appendFileSync, realpathSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { relative } from 'node:path';
import {
  PINNED_MODEL,
  JOB_STATUS,
  RESULT_WATCHDOG_MS as DEFAULT_WATCHDOG_MS,
} from './constants.mjs';
import {
  snapshotChangedPaths,
  snapshotTouchedFiles,
} from './git-snapshot.mjs';
import {
  writeJob,
  readJob,
  setCurrentJob,
  getJobStdoutPath,
  getJobStderrPath,
} from './jobs.mjs';
import {
  acquireWriterLock,
  releaseLock,
  updateLockChildPid,
  updateLockWrapperPid,
  reconcileStaleLock,
  isProcessAlive,
} from './lock.mjs';
import { redactString } from './redact.mjs';
import { parseStreamLine, applyStreamEvent } from './stream-parser.mjs';
import { killProcessTree, spawnForeground } from './process-tree.mjs';

const RESULT_WATCHDOG_MS = Number(process.env.CURSOR_EXECUTOR_RESULT_WATCHDOG_MS || DEFAULT_WATCHDOG_MS);

export function buildAgentArgv({ mode, taskRepoRelative, sessionId }) {
  const argv = [
    'cursor-agent',
    '--print',
    '--force',
    '--output-format',
    'stream-json',
    '--model',
    PINNED_MODEL,
  ];
  if (mode === 'resume') {
    if (!sessionId) {
      throw new Error('Resume requires a session id');
    }
    argv.push('--resume', sessionId);
  }
  if (!taskRepoRelative) {
    throw new Error('Task packet path is required');
  }
  argv.push(`Read ${taskRepoRelative} fully and execute it exactly`);
  return argv;
}

function persistJob(fs, repoRoot, job) {
  job.updatedAt = new Date().toISOString();
  writeJob(fs, repoRoot, job);
}

async function readStdoutLines(child, onLine) {
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of rl) {
    onLine(line);
  }
}

async function readStderr(child, stderrPath, fs) {
  for await (const chunk of child.stderr) {
    const text = chunk.toString();
    appendFileSync(stderrPath, redactString(text), 'utf8');
  }
}

function finalizeStatus(job, exitCode, cancelled, timedOut) {
  if (cancelled) {
    job.status = JOB_STATUS.CANCELLED;
  } else if (timedOut) {
    job.status = JOB_STATUS.TIMED_OUT;
  } else if (job.terminalResult?.isError) {
    job.status = JOB_STATUS.FAILED;
  } else if (job.terminalResult) {
    job.status = JOB_STATUS.COMPLETED;
  } else if (exitCode !== 0) {
    job.status = JOB_STATUS.FAILED;
  } else {
    job.status = JOB_STATUS.FAILED;
    job.summary = job.summary ?? 'No terminal stream-json result received';
  }
  job.exitCode = exitCode;
  job.endedAt = new Date().toISOString();
}

function resolveCursorAgent() {
  return process.env.CURSOR_EXECUTOR_CURSOR_AGENT ?? 'cursor-agent';
}

export async function runJob(fs, repoRoot, job) {
  const stdoutPath = getJobStdoutPath(repoRoot, job.jobId);
  const stderrPath = getJobStderrPath(repoRoot, job.jobId);
  job.stdoutLog = stdoutPath;
  job.stderrLog = stderrPath;
  fs.writeFileSync(stdoutPath, '', 'utf8');
  fs.writeFileSync(stderrPath, '', 'utf8');

  const argv = [...job.argv];
  argv[0] = resolveCursorAgent();

  let child;
  let spawnError = null;
  child = spawnForeground(argv, { cwd: repoRoot, env: process.env });
  child.on('error', (error) => {
    spawnError = error;
  });

  if (!child.pid) {
    await new Promise((resolve) => setImmediate(resolve));
    if (spawnError) {
      job.status = JOB_STATUS.SPAWN_FAILED;
      job.summary = spawnError.message;
      job.endedAt = new Date().toISOString();
      persistJob(fs, repoRoot, job);
      releaseLock(fs, repoRoot, job.jobId);
      throw spawnError;
    }
  }

  job.childPid = child.pid;
  job.status = JOB_STATUS.RUNNING;
  updateLockChildPid(fs, repoRoot, job.jobId, child.pid);
  persistJob(fs, repoRoot, job);

  let timedOut = false;
  let resultSeenAt = null;
  let watchdogTimer = null;

  const onLine = (line) => {
    appendFileSync(stdoutPath, `${redactString(line)}\n`, 'utf8');
    const event = parseStreamLine(line);
    applyStreamEvent(job, event);
    if (event.kind === 'result' && !resultSeenAt) {
      resultSeenAt = Date.now();
      watchdogTimer = setTimeout(async () => {
        if (!child.killed) {
          await killProcessTree(child.pid);
        }
      }, RESULT_WATCHDOG_MS);
    }
    persistJob(fs, repoRoot, job);
  };

  const stdoutPromise = readStdoutLines(child, onLine);
  const stderrPromise = readStderr(child, stderrPath, fs);

  let timeoutTimer;
  const timeoutMs = (job.timeoutSeconds ?? 0) * 1000;
  if (timeoutMs > 0) {
    timeoutTimer = setTimeout(async () => {
      timedOut = true;
      job.cancelRequested = true;
      job.status = JOB_STATUS.TIMED_OUT;
      persistJob(fs, repoRoot, job);
      await killProcessTree(child.pid);
    }, timeoutMs);
  }

  const waitExit = new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });

  const exitCode = await waitExit;
  await Promise.allSettled([stdoutPromise, stderrPromise]);
  if (timeoutTimer) clearTimeout(timeoutTimer);
  if (watchdogTimer) clearTimeout(watchdogTimer);

  const latest = readJob(fs, repoRoot, job.jobId);
  job.cancelRequested = latest.cancelRequested;
  job.sessionId = latest.sessionId ?? job.sessionId;
  job.reportedModel = latest.reportedModel ?? job.reportedModel;
  job.terminalResult = latest.terminalResult ?? job.terminalResult;
  job.diagnostics = latest.diagnostics ?? job.diagnostics;
  job.summary = latest.summary ?? job.summary;

  job.postRunChangedPaths = snapshotChangedPaths(
    repoRoot,
    job.baselineDirtyPaths,
  );
  job.touchedFiles = snapshotTouchedFiles(
    repoRoot,
    job.baselineDirtyPaths,
    job.baselinePathHashes ?? {},
  );

  if (spawnError) {
    job.status = JOB_STATUS.SPAWN_FAILED;
    job.summary = spawnError.message;
  } else if (timedOut) {
    job.status = JOB_STATUS.TIMED_OUT;
  } else if (job.cancelRequested) {
    job.status = JOB_STATUS.CANCELLED;
  } else {
    finalizeStatus(job, exitCode, false, false);
  }

  job.exitCode = exitCode;
  job.endedAt = new Date().toISOString();
  persistJob(fs, repoRoot, job);
  releaseLock(fs, repoRoot, job.jobId);
  return job;
}

export async function startJob(fs, repoRoot, options) {
  reconcileStaleLock(fs, repoRoot);
  const lockAttempt = acquireWriterLock(fs, repoRoot, {
    jobId: options.job.jobId,
    wrapperPid: process.pid,
    childPid: null,
  });
  if (!lockAttempt.ok) {
    const err = new Error('Another writer job is active for this repository');
    err.code = 'WRITER_LOCKED';
    err.lock = lockAttempt.lock;
    throw err;
  }

  try {
    writeJob(fs, repoRoot, options.job);
    setCurrentJob(fs, repoRoot, options.job.jobId);

    if (options.background) {
      options.job.status = JOB_STATUS.RUNNING;
      writeJob(fs, repoRoot, options.job);
      const child = await import('node:child_process').then(({ spawn: sp }) => {
        const proc = sp(process.execPath, [options.executorPath, 'run-internal', options.job.jobId], {
          cwd: repoRoot,
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            CURSOR_EXECUTOR_REPO_ROOT: repoRoot,
          },
        });
        proc.unref();
        return proc;
      });
      updateLockWrapperPid(fs, repoRoot, options.job.jobId, child.pid);
      options.job.wrapperPid = child.pid;
      writeJob(fs, repoRoot, options.job);
      return options.job;
    }
    return await runJob(fs, repoRoot, options.job);
  } catch (error) {
    releaseLock(fs, repoRoot, options.job.jobId);
    throw error;
  }
}

export async function cancelJob(fs, repoRoot, jobId) {
  const job = readJob(fs, repoRoot, jobId);
  job.cancelRequested = true;
  writeJob(fs, repoRoot, job);

  const pids = new Set();
  if (job.wrapperPid) pids.add(job.wrapperPid);
  if (job.childPid) pids.add(job.childPid);

  for (const pid of pids) {
    if (isProcessAlive(pid)) {
      await killProcessTree(pid);
    }
  }

  const latest = readJob(fs, repoRoot, jobId);
  if ([JOB_STATUS.RUNNING, JOB_STATUS.PENDING].includes(latest.status)) {
    latest.status = JOB_STATUS.CANCELLED;
    latest.cancelRequested = true;
    latest.endedAt = new Date().toISOString();
    writeJob(fs, repoRoot, latest);
  }

  if (!isProcessAlive(latest.wrapperPid) && !isProcessAlive(latest.childPid)) {
    releaseLock(fs, repoRoot, jobId);
  }

  return readJob(fs, repoRoot, jobId);
}

export function waitForJob(fs, repoRoot, jobId, { pollMs = 200, timeoutMs = 600_000 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      let job;
      try {
        job = readJob(fs, repoRoot, jobId);
      } catch (error) {
        reject(error);
        return;
      }
      if ([
        JOB_STATUS.COMPLETED,
        JOB_STATUS.FAILED,
        JOB_STATUS.CANCELLED,
        JOB_STATUS.TIMED_OUT,
        JOB_STATUS.SPAWN_FAILED,
        JOB_STATUS.INTERRUPTED,
      ].includes(job.status)) {
        resolve(job);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timed out waiting for job'));
        return;
      }
      setTimeout(check, pollMs);
    };
    check();
  });
}

export function toRepoRelativeTaskPath(repoRoot, taskAbsolute) {
  const realRepo = realpathSync(repoRoot);
  return relative(realRepo, taskAbsolute);
}
