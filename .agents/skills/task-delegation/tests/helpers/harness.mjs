import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { installFakeAgent } from './fake-agent.mjs';

const EXECUTOR = new URL('../../scripts/cursor-executor.mjs', import.meta.url).pathname;

export function createTempRepo(name = 'repo') {
  const dir = mkdtempSync(join(tmpdir(), `td-${name}-`));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  writeFileSync(join(dir, 'README.md'), '# test\n', 'utf8');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  return dir;
}

export function createTempRepoWithSpaces() {
  const parent = mkdtempSync(join(tmpdir(), 'td-spaces-'));
  const dir = join(parent, 'my repo');
  mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  writeFileSync(join(dir, 'README.md'), '# spaced\n', 'utf8');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  return dir;
}

export function writeTaskPacket(repoRoot, relativePath = '.agent-orchestration/tasks/slice.md', content = '# Slice\n\n## Goal\nDo thing.\n') {
  const full = join(repoRoot, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  return relativePath;
}

export function setupHarness({ scenario = 'success', stateHome, extraEnv = {} } = {}) {
  const repoRoot = createTempRepo();
  const binDir = mkdtempSync(join(tmpdir(), 'td-bin-'));
  const argvLog = join(repoRoot, 'argv.log');
  installFakeAgent(binDir);
  const stateDir = stateHome ?? mkdtempSync(join(tmpdir(), 'td-state-'));
  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    XDG_STATE_HOME: stateDir,
    FAKE_AGENT_SCENARIO: scenario,
    FAKE_AGENT_ARGV_LOG: argvLog,
    MY_API_TOKEN: 'super-secret-token-value',
    ...extraEnv,
  };
  return { repoRoot, binDir, argvLog, stateDir, env, executor: EXECUTOR };
}

export function runExecutor(args, { repoRoot, env, executor = EXECUTOR }) {
  const result = execFileSync(process.execPath, [executor, ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(result);
}

export function runExecutorRaw(args, { repoRoot, env, executor = EXECUTOR }) {
  try {
    const stdout = execFileSync(process.execPath, [executor, ...args], {
      cwd: repoRoot,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout, json: JSON.parse(stdout) };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
      json: error.stdout ? JSON.parse(error.stdout.toString()) : null,
      status: error.status,
    };
  }
}

export function runExecutorAsync(args, { repoRoot, env, executor = EXECUTOR }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [executor, ...args], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      let json = null;
      if (stdout.trim()) {
        try {
          json = JSON.parse(stdout);
        } catch {
          json = null;
        }
      }
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
        json,
      });
    });
  });
}

export { EXECUTOR };
