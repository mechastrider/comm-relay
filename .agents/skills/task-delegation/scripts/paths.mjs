import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { readFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export function getXdgStateHome() {
  if (process.env.XDG_STATE_HOME) {
    return resolve(process.env.XDG_STATE_HOME);
  }
  return join(homedir(), '.local', 'state');
}

export function hashRepoRoot(repoRoot) {
  const canonical = realpathSync(repoRoot);
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

export function getStateRoot() {
  return join(getXdgStateHome(), 'agent-orchestration', 'jobs');
}

export function getRepoJobsDir(repoRoot) {
  return join(getStateRoot(), hashRepoRoot(repoRoot));
}

export function getLockPath(repoRoot) {
  return join(getRepoJobsDir(repoRoot), 'writer.lock');
}

export function getCurrentJobPath(repoRoot) {
  return join(getRepoJobsDir(repoRoot), 'current.json');
}

export function getJobDir(repoRoot, jobId) {
  return join(getRepoJobsDir(repoRoot), jobId);
}

export function getJobRecordPath(repoRoot, jobId) {
  return join(getJobDir(repoRoot, jobId), 'job.json');
}

export function resolveGitRoot(cwd = process.cwd()) {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return realpathSync(out);
  } catch {
    throw new Error('Not inside a Git work tree');
  }
}

export function resolveTaskPath(repoRoot, taskPath) {
  const absolute = isAbsolute(taskPath)
    ? resolve(taskPath)
    : resolve(repoRoot, taskPath);
  const realRepo = realpathSync(repoRoot);
  const repoRelative = relative(realRepo, absolute);
  if (repoRelative.startsWith('..') || isAbsolute(repoRelative)) {
    throw new Error(`Task path must be inside repository work tree: ${taskPath}`);
  }
  let realTask;
  try {
    realTask = realpathSync(absolute);
  } catch {
    throw new Error(`Task file does not exist: ${taskPath}`);
  }
  const rel = relative(realRepo, realTask);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Task path must be inside repository work tree: ${taskPath}`);
  }
  return realTask;
}

export function hashFileContents(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function ensureDirExists(fs, dir) {
  fs.mkdirSync(dir, { recursive: true });
}
