import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { KILL_GRACE_MS } from './constants.mjs';

const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getKillCommandPolicy() {
  if (process.platform === 'win32') {
    return {
      platform: 'win32',
      graceful: (pid) => ['taskkill', ['/PID', String(pid), '/T']],
      force: (pid) => ['taskkill', ['/PID', String(pid), '/T', '/F']],
    };
  }
  return {
    platform: 'unix',
    graceful: (pid) => ({ signal: 'SIGTERM', pidGroup: -pid }),
    force: (pid) => ({ signal: 'SIGKILL', pidGroup: -pid }),
  };
}

async function killUnix(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // already dead
    }
  }
}

async function killWindows(pid, force) {
  const args = ['/PID', String(pid), '/T'];
  if (force) args.push('/F');
  try {
    await execFileAsync('taskkill', args, { windowsHide: true });
  } catch {
    // already dead
  }
}

export async function killProcessTree(pid, { graceMs = KILL_GRACE_MS } = {}) {
  if (!pid || pid <= 0) return;
  if (process.platform === 'win32') {
    await killWindows(pid, false);
    await sleep(graceMs);
    await killWindows(pid, true);
    return;
  }
  await killUnix(pid, 'SIGTERM');
  await sleep(graceMs);
  await killUnix(pid, 'SIGKILL');
}

export function spawnDetached(argv, { cwd, env }) {
  return spawn(argv[0], argv.slice(1), {
    cwd,
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function spawnForeground(argv, { cwd, env }) {
  const child = spawn(argv[0], argv.slice(1), {
    cwd,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (process.platform !== 'win32' && child.pid) {
    child.unref();
  }
  return child;
}
