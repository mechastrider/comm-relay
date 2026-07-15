#!/usr/bin/env node
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runDoctor } from './doctor.mjs';
import { DEFAULT_TIMEOUT_SECONDS, JOB_STATUS, TERMINAL_STATUSES } from './constants.mjs';
import { snapshotDirtyPaths, snapshotPathHashes } from './git-snapshot.mjs';
import {
  createJobId,
  newJobRecord,
  readJob,
  getCurrentJobId,
} from './jobs.mjs';
import {
  resolveGitRoot,
  resolveTaskPath,
  hashRepoRoot,
  ensureDirExists,
  getRepoJobsDir,
} from './paths.mjs';
import { reconcileStaleLock } from './lock.mjs';
import {
  buildAgentArgv,
  startJob,
  runJob,
  cancelJob,
  waitForJob,
  toRepoRelativeTaskPath,
} from './spawn-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTOR_PATH = resolve(__dirname, 'cursor-executor.mjs');

const FORBIDDEN_FLAGS = new Set(['model', 'session', 'cursor-agent', 'fast', 'auto']);

const COMMAND_FLAGS = {
  doctor: new Set(['help']),
  start: new Set(['task', 'background', 'timeout', 'help']),
  resume: new Set(['job', 'task', 'background', 'timeout', 'help']),
  status: new Set(['job', 'help']),
  result: new Set(['job', 'wait', 'help']),
  cancel: new Set(['job', 'help']),
  'run-internal': new Set(),
};

function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function printHelp() {
  process.stdout.write(`cursor-executor — project-local Cursor CLI job runner

Usage:
  cursor-executor.mjs doctor
  cursor-executor.mjs start --task <repo-relative.md> [--background] [--timeout <seconds>]
  cursor-executor.mjs resume --job <prior-job-id> --task <repo-relative.md> [--background] [--timeout <seconds>]
  cursor-executor.mjs status [--job <id>]
  cursor-executor.mjs result [--job <id>] [--wait]
  cursor-executor.mjs cancel --job <id>

Commands:
  doctor   Check Node, Git, cursor-agent, auth, state dir, stream-json
  start    Run a task packet via cursor-agent (composer-2.5)
  resume   Resume a prior Cursor session with a new task packet
  status   Show job status
  result   Show terminal result for a job
  cancel   Cancel a running job

Options:
  --task <path>         Repository-local task packet (required for start and resume)
  --job <id>            Job id (required for resume and cancel; optional for status/result)
  --background          Return immediately; poll status/result
  --timeout <seconds>   Total job timeout in seconds (default: ${DEFAULT_TIMEOUT_SECONDS})
  --wait                Block until job is terminal (result only)
  -h, --help            Show this help
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (['background', 'wait', 'help'].includes(key)) {
        args[key] = true;
        continue;
      }
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
        continue;
      }
      args[key] = true;
      continue;
    }
    args._.push(token);
  }
  return args;
}

export function validateCliArgs(command, args) {
  if (!COMMAND_FLAGS[command]) {
    throw new Error(`Unknown command: ${command}`);
  }
  for (const key of Object.keys(args)) {
    if (key === '_' || key === 'help') continue;
    if (FORBIDDEN_FLAGS.has(key)) {
      throw new Error(`Unknown or unsupported flag: --${key}`);
    }
    if (!COMMAND_FLAGS[command].has(key)) {
      throw new Error(`Unknown or inapplicable flag for ${command}: --${key}`);
    }
  }
}

function getRepoRoot() {
  if (process.env.CURSOR_EXECUTOR_REPO_ROOT) {
    return resolve(process.env.CURSOR_EXECUTOR_REPO_ROOT);
  }
  return resolveGitRoot();
}

function resolveJobId(fsImpl, repoRoot, jobId) {
  return jobId || getCurrentJobId(fsImpl, repoRoot);
}

function parseTimeoutSeconds(raw) {
  if (raw == null || raw === true) {
    return DEFAULT_TIMEOUT_SECONDS;
  }
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('timeout must be a non-negative number of seconds');
  }
  return seconds;
}

function prepareTask(repoRoot, taskArg) {
  const taskAbsolute = resolveTaskPath(repoRoot, taskArg);
  const taskRepoRelative = toRepoRelativeTaskPath(repoRoot, taskAbsolute);
  return { taskAbsolute, taskRepoRelative };
}

async function cmdDoctor() {
  const report = runDoctor();
  printJson(report);
  process.exit(report.ok ? 0 : 1);
}

async function cmdStart(args) {
  const repoRoot = getRepoRoot();
  const { taskAbsolute, taskRepoRelative } = prepareTask(repoRoot, args.task);
  const repoHash = hashRepoRoot(repoRoot);
  ensureDirExists(fs, getRepoJobsDir(repoRoot));

  const baselineDirtyPaths = snapshotDirtyPaths(repoRoot);
  const baselinePathHashes = snapshotPathHashes(repoRoot, baselineDirtyPaths);
  const timeoutSeconds = parseTimeoutSeconds(args.timeout);
  const jobId = createJobId();
  const argv = buildAgentArgv({ mode: 'start', taskRepoRelative });
  const job = newJobRecord({
    jobId,
    repoRoot,
    repoHash,
    taskPath: taskAbsolute,
    taskRepoRelative,
    mode: 'start',
    background: Boolean(args.background),
    timeoutSeconds,
    argv,
    baselineDirtyPaths,
    baselinePathHashes,
  });

  const result = await startJob(fs, repoRoot, {
    job,
    background: Boolean(args.background),
    executorPath: EXECUTOR_PATH,
  });
  printJson(result);
  process.exit(TERMINAL_STATUSES.has(result.status) && result.status !== JOB_STATUS.COMPLETED ? 1 : 0);
}

async function cmdResume(args) {
  const repoRoot = getRepoRoot();
  const repoHash = hashRepoRoot(repoRoot);
  ensureDirExists(fs, getRepoJobsDir(repoRoot));

  if (!args.job) {
    throw new Error('resume requires --job <prior-job-id>');
  }
  if (!args.task) {
    throw new Error('resume requires --task <repo-relative.md>');
  }

  const prior = readJob(fs, repoRoot, args.job);
  const sessionId = prior.sessionId;
  if (!sessionId) {
    throw new Error(`Prior job ${args.job} has no session id`);
  }

  const { taskAbsolute, taskRepoRelative } = prepareTask(repoRoot, args.task);
  const baselineDirtyPaths = snapshotDirtyPaths(repoRoot);
  const baselinePathHashes = snapshotPathHashes(repoRoot, baselineDirtyPaths);
  const timeoutSeconds = parseTimeoutSeconds(args.timeout);
  const jobId = createJobId();
  const argv = buildAgentArgv({ mode: 'resume', taskRepoRelative, sessionId });
  const job = newJobRecord({
    jobId,
    priorJobId: args.job,
    repoRoot,
    repoHash,
    taskPath: taskAbsolute,
    taskRepoRelative,
    mode: 'resume',
    background: Boolean(args.background),
    timeoutSeconds,
    argv,
    baselineDirtyPaths,
    baselinePathHashes,
  });
  job.sessionId = sessionId;

  const result = await startJob(fs, repoRoot, {
    job,
    background: Boolean(args.background),
    executorPath: EXECUTOR_PATH,
  });
  printJson(result);
  process.exit(TERMINAL_STATUSES.has(result.status) && result.status !== JOB_STATUS.COMPLETED ? 1 : 0);
}

async function cmdStatus(args) {
  const repoRoot = getRepoRoot();
  reconcileStaleLock(fs, repoRoot);
  const jobId = resolveJobId(fs, repoRoot, args.job);
  if (!jobId) {
    printJson({ status: 'idle' });
    return;
  }
  const job = readJob(fs, repoRoot, jobId);
  printJson(job);
}

async function cmdResult(args) {
  const repoRoot = getRepoRoot();
  const jobId = resolveJobId(fs, repoRoot, args.job);
  if (!jobId) {
    printJson({ status: 'idle' });
    return;
  }
  if (args.wait) {
    const finalJob = await waitForJob(fs, repoRoot, jobId);
    printJson({
      jobId: finalJob.jobId,
      status: finalJob.status,
      summary: finalJob.summary,
      terminalResult: finalJob.terminalResult,
      exitCode: finalJob.exitCode,
      postRunChangedPaths: finalJob.postRunChangedPaths,
      touchedFiles: finalJob.touchedFiles,
    });
    process.exit(finalJob.status === JOB_STATUS.COMPLETED ? 0 : 1);
    return;
  }
  const job = readJob(fs, repoRoot, jobId);
  printJson({
    jobId: job.jobId,
    status: job.status,
    summary: job.summary,
    terminalResult: job.terminalResult,
    exitCode: job.exitCode,
    postRunChangedPaths: job.postRunChangedPaths,
    touchedFiles: job.touchedFiles,
  });
  if (TERMINAL_STATUSES.has(job.status) && job.status !== JOB_STATUS.COMPLETED) {
    process.exit(1);
  }
}

async function cmdCancel(args) {
  const repoRoot = getRepoRoot();
  if (!args.job) {
    throw new Error('cancel requires --job <id>');
  }
  const job = await cancelJob(fs, repoRoot, args.job);
  printJson(job);
}

async function cmdRunInternal(jobId) {
  const repoRoot = getRepoRoot();
  const job = readJob(fs, repoRoot, jobId);
  const finalJob = await runJob(fs, repoRoot, job);
  printJson(finalJob);
  process.exit(finalJob.status === JOB_STATUS.COMPLETED ? 0 : 1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    printHelp();
    process.exit(0);
  }

  const [command, ...rest] = args._;
  try {
    if (command !== 'run-internal') {
      validateCliArgs(command, args);
    }
    switch (command) {
      case 'doctor':
        await cmdDoctor();
        break;
      case 'start':
        if (!args.task) throw new Error('start requires --task <path>');
        await cmdStart(args);
        break;
      case 'resume':
        await cmdResume(args);
        break;
      case 'status':
        await cmdStatus(args);
        break;
      case 'result':
        await cmdResult(args);
        break;
      case 'cancel':
        await cmdCancel(args);
        break;
      case 'run-internal':
        await cmdRunInternal(rest[0]);
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const payload = {
      error: error.message,
      code: error.code ?? 'ERROR',
    };
    if (error.lock) payload.lock = error.lock;
    printJson(payload);
    process.exit(1);
  }
}

main();
