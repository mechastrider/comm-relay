import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getStateRoot } from './paths.mjs';
import { PINNED_MODEL } from './constants.mjs';

function resolveCursorAgent() {
  return process.env.CURSOR_EXECUTOR_CURSOR_AGENT ?? 'cursor-agent';
}

function checkNode() {
  return { name: 'node', ok: true, detail: process.version };
}

function checkGit() {
  try {
    const version = execFileSync('git', ['--version'], { encoding: 'utf8' }).trim();
    return { name: 'git', ok: true, detail: version };
  } catch (error) {
    return { name: 'git', ok: false, detail: error.message };
  }
}

function checkCursorAgent(cursorAgent) {
  try {
    const version = execFileSync(cursorAgent, ['--version'], { encoding: 'utf8' }).trim();
    return { name: 'cursor-agent', ok: true, detail: version };
  } catch (error) {
    return { name: 'cursor-agent', ok: false, detail: error.message };
  }
}

function checkAuth(cursorAgent) {
  try {
    const out = execFileSync(cursorAgent, ['status'], { encoding: 'utf8' });
    const loggedIn = /logged in/i.test(out);
    return {
      name: 'cursor-auth',
      ok: loggedIn,
      detail: loggedIn ? out.trim() : 'Not authenticated — run `cursor-agent login`',
    };
  } catch {
    return {
      name: 'cursor-auth',
      ok: false,
      detail: 'Not authenticated — run `cursor-agent login`',
    };
  }
}

function checkStateWritable() {
  try {
    const dir = getStateRoot();
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, `.write-probe-${process.pid}`);
    writeFileSync(probe, 'ok', 'utf8');
    unlinkSync(probe);
    return { name: 'state-dir', ok: true, detail: dir };
  } catch (error) {
    return { name: 'state-dir', ok: false, detail: error.message };
  }
}

function checkStreamJson(cursorAgent) {
  try {
    const out = execFileSync(cursorAgent, ['--help'], { encoding: 'utf8' });
    const ok = out.includes('stream-json');
    return {
      name: 'stream-json',
      ok,
      detail: ok ? 'supported' : 'stream-json not listed in --help',
    };
  } catch (error) {
    return { name: 'stream-json', ok: false, detail: error.message };
  }
}

export function runDoctor() {
  const cursorAgent = resolveCursorAgent();
  const checks = [
    checkNode(),
    checkGit(),
    checkCursorAgent(cursorAgent),
    checkAuth(cursorAgent),
    checkStateWritable(),
    checkStreamJson(cursorAgent),
  ];
  const blockingOk = checks.every((c) => {
    if (c.name === 'cursor-auth') return c.ok;
    return c.ok;
  });
  return {
    ok: blockingOk,
    pinnedModel: PINNED_MODEL,
    checks,
  };
}
