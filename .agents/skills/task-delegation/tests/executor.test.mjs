import assert from 'node:assert/strict';
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  writeFileSync as writeFs,
  utimesSync,
} from 'node:fs';
import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { acquireWriterLock, releaseLock } from '../scripts/lock.mjs';
import { listJobIds } from '../scripts/jobs.mjs';
import { getKillCommandPolicy } from '../scripts/process-tree.mjs';
import { hashFileContents, hashRepoRoot } from '../scripts/paths.mjs';
import { redactString, resetSensitiveEnvCache } from '../scripts/redact.mjs';
import {
  setupHarness,
  writeTaskPacket,
  runExecutorRaw,
  runExecutor,
  runExecutorAsync,
  createTempRepoWithSpaces,
} from './helpers/harness.mjs';

function jobRecordPath(stateDir, repoRoot, jobId) {
  const repoHash = hashRepoRoot(repoRoot);
  return join(stateDir, 'agent-orchestration', 'jobs', repoHash, jobId, 'job.json');
}

function lockPathFor(stateDir, repoRoot) {
  const repoHash = hashRepoRoot(repoRoot);
  return join(stateDir, 'agent-orchestration', 'jobs', repoHash, 'writer.lock');
}

function currentJobPath(stateDir, repoRoot) {
  const repoHash = hashRepoRoot(repoRoot);
  return join(stateDir, 'agent-orchestration', 'jobs', repoHash, 'current.json');
}

function stderrLogPath(stateDir, repoRoot, jobId) {
  const repoHash = hashRepoRoot(repoRoot);
  return join(stateDir, 'agent-orchestration', 'jobs', repoHash, jobId, 'stderr.log');
}

function withStateHome(h, fn) {
  const previousStateHome = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = h.stateDir;
  try {
    return fn();
  } finally {
    if (previousStateHome === undefined) {
      delete process.env.XDG_STATE_HOME;
    } else {
      process.env.XDG_STATE_HOME = previousStateHome;
    }
  }
}

test('start pins exact argv and composer-2.5 model', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.equal(job.status, 'completed');
  assert.equal(job.requestedModel, 'composer-2.5');
  const argvLines = readFileSync(h.argvLog, 'utf8').trim().split('\n');
  const argv = JSON.parse(argvLines[0]);
  const flagStart = argv.indexOf('--print');
  assert.deepEqual(
    argv.slice(flagStart, flagStart + 6),
    ['--print', '--force', '--output-format', 'stream-json', '--model', 'composer-2.5'],
  );
  assert.match(argv[argv.length - 1], /Read \.agent-orchestration\/tasks\/slice\.md fully and execute it exactly/);
  assert.ok(!argv.some((arg) => typeof arg === 'string' && arg.includes('-fast')));
});

test('timeout input is seconds and converted internally', () => {
  const h = setupHarness({
    scenario: 'slow',
    extraEnv: { CURSOR_EXECUTOR_RESULT_WATCHDOG_MS: '200' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const out = runExecutorRaw(['start', '--task', task, '--timeout', '1'], h);
  assert.equal(out.json.status, 'timed_out');
  assert.equal(out.json.timeoutSeconds, 1);
});

test('task content hash is stored on the job record', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot, '.agent-orchestration/tasks/slice.md', '# unique content\n');
  const job = runExecutor(['start', '--task', task], h);
  const expected = hashFileContents(join(h.repoRoot, task));
  assert.equal(job.taskHash, expected);
});

test('foreground start completes with session and reported model', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.equal(job.status, 'completed');
  assert.equal(job.sessionId, 'sess-1');
  assert.equal(job.reportedModel, 'Composer 2.5');
  assert.equal(job.terminalResult.result, 'done');
  assert.ok(job.stdoutLog.endsWith('/stdout.ndjson'));
  assert.ok(job.stderrLog.endsWith('/stderr.log'));
});

test('writer lock is removed immediately after job completion', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  runExecutor(['start', '--task', task], h);
  assert.ok(!existsSync(lockPathFor(h.stateDir, h.repoRoot)));
});

test('background start returns immediately and result wait completes', () => {
  const h = setupHarness({
    extraEnv: { CURSOR_EXECUTOR_RESULT_WATCHDOG_MS: '200' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const started = runExecutor(['start', '--task', task, '--background'], h);
  assert.equal(started.background, true);
  assert.equal(started.status, 'running');
  const result = runExecutor(['result', '--job', started.jobId, '--wait'], h);
  assert.equal(result.status, 'completed');
  assert.ok(!existsSync(lockPathFor(h.stateDir, h.repoRoot)));
});

test('resume contract loads prior session, links jobs, and validates task packet', () => {
  const h = setupHarness({ scenario: 'resume' });
  const firstTask = writeTaskPacket(h.repoRoot, '.agent-orchestration/tasks/first.md');
  const first = runExecutor(['start', '--task', firstTask], {
    ...h,
    env: { ...h.env, FAKE_AGENT_SCENARIO: 'success' },
  });
  const followUpTask = writeTaskPacket(h.repoRoot, '.agent-orchestration/tasks/follow-up.md', '# Follow up\n');
  const resumed = runExecutor(['resume', '--job', first.jobId, '--task', followUpTask], {
    ...h,
    env: { ...h.env, FAKE_AGENT_SCENARIO: 'resume' },
  });
  assert.equal(resumed.status, 'completed');
  assert.equal(resumed.priorJobId, first.jobId);
  assert.equal(resumed.sessionId, 'sess-resumed');
  assert.equal(resumed.taskPath, '.agent-orchestration/tasks/follow-up.md');
  const argvLines = readFileSync(h.argvLog, 'utf8').trim().split('\n');
  const lastArgv = JSON.parse(argvLines[argvLines.length - 1]);
  assert.ok(lastArgv.includes('--resume'));
  assert.ok(lastArgv.includes(first.sessionId));
  assert.match(lastArgv[lastArgv.length - 1], /Read \.agent-orchestration\/tasks\/follow-up\.md fully and execute it exactly/);
});

test('resume without task packet is rejected', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const first = runExecutor(['start', '--task', task], h);
  const out = runExecutorRaw(['resume', '--job', first.jobId], h);
  assert.equal(out.ok, false);
  assert.match(out.json.error, /--task/);
});

test('cancel requires --job and terminates a running background job', async () => {
  const h = setupHarness({
    scenario: 'cancel-me',
    extraEnv: { CURSOR_EXECUTOR_RESULT_WATCHDOG_MS: '200' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const missingJob = runExecutorRaw(['cancel'], h);
  assert.equal(missingJob.ok, false);
  assert.match(missingJob.json.error, /--job/);

  const started = runExecutor(['start', '--task', task, '--background'], h);
  runExecutor(['cancel', '--job', started.jobId], h);
  const result = runExecutorRaw(['result', '--job', started.jobId, '--wait'], h);
  assert.equal(result.json.status, 'cancelled');
});

test('parallel executor processes leave exactly one fake agent spawn', async () => {
  const h = setupHarness({
    scenario: 'cancel-me',
    extraEnv: { CURSOR_EXECUTOR_RESULT_WATCHDOG_MS: '200' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      runExecutorAsync(['start', '--task', task, '--background'], h),
    ),
  );
  const locked = results.filter((r) => r.json?.code === 'WRITER_LOCKED');
  const winners = results.filter((r) => r.json?.jobId && r.json?.code !== 'WRITER_LOCKED');
  assert.equal(locked.length, 7);
  assert.equal(winners.length, 1);
  assert.equal(winners[0].json.status, 'running');

  const deadline = Date.now() + 5_000;
  let argvLines = [];
  while (Date.now() < deadline) {
    if (existsSync(h.argvLog)) {
      argvLines = readFileSync(h.argvLog, 'utf8').trim().split('\n').filter(Boolean);
      if (argvLines.length >= 1) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(argvLines.length, 1);

  const winnerId = winners[0].json.jobId;
  const current = JSON.parse(readFileSync(currentJobPath(h.stateDir, h.repoRoot), 'utf8'));
  assert.equal(current.jobId, winnerId);
  const previousStateHome = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = h.stateDir;
  try {
    const publishedJobIds = listJobIds(fs, h.repoRoot);
    assert.deepEqual(publishedJobIds, [winnerId]);
  } finally {
    if (previousStateHome === undefined) {
      delete process.env.XDG_STATE_HOME;
    } else {
      process.env.XDG_STATE_HOME = previousStateHome;
    }
  }
  for (const result of locked) {
    assert.equal(result.json.jobId, undefined);
  }

  runExecutor(['cancel', '--job', winners[0].json.jobId], h);
});

test('recent partial malformed lock blocks acquisition', () => {
  const h = setupHarness();
  withStateHome(h, () => {
    const lockPath = lockPathFor(h.stateDir, h.repoRoot);
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFs(lockPath, '{"jobId":"partial",');
    const blocked = acquireWriterLock(fs, h.repoRoot, {
      jobId: 'job-b',
      wrapperPid: process.pid,
      childPid: null,
    });
    assert.equal(blocked.ok, false);
    releaseLock(fs, h.repoRoot, 'partial');
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // partial lock has no jobId owner
    }
  });
});

test('aged malformed lock is recoverable', () => {
  const h = setupHarness();
  withStateHome(h, () => {
    const previousTtl = process.env.CURSOR_EXECUTOR_MALFORMED_LOCK_TTL_MS;
    process.env.CURSOR_EXECUTOR_MALFORMED_LOCK_TTL_MS = '50';
    try {
      const lockPath = lockPathFor(h.stateDir, h.repoRoot);
      mkdirSync(dirname(lockPath), { recursive: true });
      writeFs(lockPath, 'not-json');
      const old = new Date(Date.now() - 1_000);
      utimesSync(lockPath, old, old);
      const acquired = acquireWriterLock(fs, h.repoRoot, {
        jobId: 'job-recovered',
        wrapperPid: process.pid,
        childPid: null,
      });
      assert.equal(acquired.ok, true);
      releaseLock(fs, h.repoRoot, 'job-recovered');
    } finally {
      if (previousTtl === undefined) {
        delete process.env.CURSOR_EXECUTOR_MALFORMED_LOCK_TTL_MS;
      } else {
        process.env.CURSOR_EXECUTOR_MALFORMED_LOCK_TTL_MS = previousTtl;
      }
    }
  });
});

test('atomic writer lock acquisition rejects a second holder', () => {
  const h = setupHarness();
  withStateHome(h, () => {
    const first = acquireWriterLock(fs, h.repoRoot, {
      jobId: 'job-a',
      wrapperPid: process.pid,
      childPid: null,
    });
    assert.equal(first.ok, true);
    const second = acquireWriterLock(fs, h.repoRoot, {
      jobId: 'job-b',
      wrapperPid: process.pid,
      childPid: null,
    });
    assert.equal(second.ok, false);
    releaseLock(fs, h.repoRoot, 'job-a');
  });
});

test('stale lock reconciles and marks interrupted jobs', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const staleJobId = 'stale-running-job';
  const repoHash = hashRepoRoot(h.repoRoot);
  const jobDir = join(h.stateDir, 'agent-orchestration', 'jobs', repoHash, staleJobId);
  mkdirSync(jobDir, { recursive: true });
  writeFs(join(jobDir, 'job.json'), `${JSON.stringify({
    schemaVersion: 1,
    jobId: staleJobId,
    status: 'running',
    wrapperPid: 999999,
    childPid: 999998,
    summary: null,
  }, null, 2)}\n`);

  writeFs(lockPathFor(h.stateDir, h.repoRoot), `${JSON.stringify({
    jobId: staleJobId,
    wrapperPid: 999999,
    childPid: 999998,
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`);

  const next = runExecutor(['start', '--task', task], h);
  assert.equal(next.status, 'completed');

  const prior = JSON.parse(readFileSync(jobRecordPath(h.stateDir, h.repoRoot, staleJobId), 'utf8'));
  assert.equal(prior.status, 'interrupted');
});

test('rejects forbidden and unknown CLI flags', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const cases = [
    ['start', ['--task', task, '--model', 'auto']],
    ['start', ['--task', task, '--session', 'sess-1']],
    ['start', ['--task', task, '--cursor-agent', '/bin/false']],
    ['start', ['--task', task, '--fast']],
    ['start', ['--task', task, '--auto']],
    ['resume', ['--job', 'job-1', '--task', task, '--model', 'opus']],
    ['status', ['--job', 'job-1', '--background']],
    ['doctor', ['--task', task]],
  ];
  for (const [command, argv] of cases) {
    const out = runExecutorRaw([command, ...argv], h);
    assert.equal(out.ok, false, `expected failure for ${command} ${argv.join(' ')}`);
    assert.match(out.json.error, /Unknown|unsupported|inapplicable|requires/i);
  }
});

test('malformed and unknown stream events are preserved', () => {
  const h = setupHarness({ scenario: 'malformed' });
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.ok(job.diagnostics.length >= 1);

  const unknownHarness = setupHarness({ scenario: 'unknown' });
  const unknownTask = writeTaskPacket(unknownHarness.repoRoot);
  const unknownJob = runExecutor(['start', '--task', unknownTask], unknownHarness);
  assert.ok(unknownJob.diagnostics.some((d) => d.streamEvent === 'unknown'));
});

test('missing terminal result fails even with exit code zero', () => {
  const h = setupHarness({ scenario: 'no-result' });
  const task = writeTaskPacket(h.repoRoot);
  const out = runExecutorRaw(['start', '--task', task], h);
  assert.equal(out.json.terminalResult, null);
  assert.equal(out.json.status, 'failed');
  assert.equal(out.ok, false);
});

test('post-result hang is ended by watchdog', () => {
  const h = setupHarness({
    scenario: 'hang-after-result',
    extraEnv: { CURSOR_EXECUTOR_RESULT_WATCHDOG_MS: '300' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.equal(job.terminalResult.result, 'done-hanging');
  assert.equal(job.status, 'completed');
});

test('spawn failure is reported when cursor-agent is missing', () => {
  const h = setupHarness({
    extraEnv: { CURSOR_EXECUTOR_CURSOR_AGENT: '/no/such/cursor-agent' },
  });
  const task = writeTaskPacket(h.repoRoot);
  const out = runExecutorRaw(['start', '--task', task], h);
  assert.equal(out.ok, false);
  assert.match(out.json.error, /ENOENT|spawn/);
  assert.ok(!existsSync(lockPathFor(h.stateDir, h.repoRoot)));
});

test('job record is atomically readable JSON', () => {
  const h = setupHarness();
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  const status = runExecutor(['status', '--job', job.jobId], h);
  assert.equal(status.schemaVersion, 1);
  assert.ok(status.jobId);
  assert.ok(existsSync(join(h.stateDir, 'agent-orchestration', 'jobs')));
  const raw = readFileSync(jobRecordPath(h.stateDir, h.repoRoot, job.jobId), 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw));
});

test('records baseline dirty paths, post-run changes, and touched files', () => {
  const h = setupHarness();
  const existingDirty = join(h.repoRoot, 'pre-existing.txt');
  writeFileSync(existingDirty, 'dirty\n', 'utf8');
  const touchPath = join(h.repoRoot, 'new-file.txt');
  h.env.FAKE_AGENT_TOUCH_PATH = touchPath;
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.ok(job.baselineDirtyPaths.includes('pre-existing.txt'));
  assert.ok(job.postRunChangedPaths.includes('new-file.txt'));
  assert.ok(!job.postRunChangedPaths.includes('pre-existing.txt'));
  assert.ok(job.touchedFiles.includes('new-file.txt'));
});

test('pre-dirty file modified during the run appears in touchedFiles', () => {
  const h = setupHarness();
  const existingDirty = join(h.repoRoot, 'pre-existing.txt');
  writeFileSync(existingDirty, 'dirty\n', 'utf8');
  h.env.FAKE_AGENT_TOUCH_PATH = existingDirty;
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  assert.ok(job.baselineDirtyPaths.includes('pre-existing.txt'));
  assert.ok(job.touchedFiles.includes('pre-existing.txt'));
  assert.ok(!job.postRunChangedPaths.includes('pre-existing.txt'));
});

test('works with task paths containing spaces', () => {
  const h = setupHarness();
  const spacedRoot = createTempRepoWithSpaces();
  const spacedHarness = {
    repoRoot: spacedRoot,
    binDir: h.binDir,
    stateDir: h.stateDir,
    argvLog: join(spacedRoot, 'argv.log'),
    env: {
      ...h.env,
      FAKE_AGENT_ARGV_LOG: join(spacedRoot, 'argv.log'),
    },
    executor: h.executor,
  };
  const task = writeTaskPacket(spacedRoot, '.agent-orchestration/tasks/my slice.md');
  const job = runExecutor(['start', '--task', task], spacedHarness);
  assert.equal(job.status, 'completed');
});

test('redacts secrets including bare values from persisted records and stderr logs', () => {
  const h = setupHarness({ scenario: 'stderr-secret' });
  const task = writeTaskPacket(h.repoRoot);
  const job = runExecutor(['start', '--task', task], h);
  const raw = readFileSync(jobRecordPath(h.stateDir, h.repoRoot, job.jobId), 'utf8');
  assert.ok(!raw.includes('super-secret-token-value'));
  const stderr = readFileSync(stderrLogPath(h.stateDir, h.repoRoot, job.jobId), 'utf8');
  assert.ok(!stderr.includes('super-secret-token-value'));
  assert.match(stderr, /\[REDACTED\]/);
});

test('redacts bare sensitive env values shorter than four characters', () => {
  resetSensitiveEnvCache();
  const env = { MY_API_TOKEN: 'xy' };
  assert.equal(redactString('prefix xy suffix', env), 'prefix [REDACTED] suffix');
  resetSensitiveEnvCache();
});

test('process-tree kill policy matches platform', () => {
  const policy = getKillCommandPolicy();
  if (process.platform === 'win32') {
    assert.equal(policy.platform, 'win32');
    assert.deepEqual(policy.force(42), ['taskkill', ['/PID', '42', '/T', '/F']]);
  } else {
    assert.equal(policy.platform, 'unix');
    assert.equal(policy.force(42).signal, 'SIGKILL');
    assert.equal(policy.force(42).pidGroup, -42);
  }
});

test('doctor reports readiness with fake cursor-agent', () => {
  const h = setupHarness();
  const report = runExecutor(['doctor'], h);
  assert.equal(report.ok, true);
  assert.equal(report.pinnedModel, 'composer-2.5');
  assert.ok(report.checks.some((c) => c.name === 'stream-json' && c.ok));
});

test('task path outside repo is rejected', () => {
  const h = setupHarness();
  const outside = join(h.repoRoot, '..', 'outside-task.md');
  writeFileSync(outside, '# outside\n', 'utf8');
  const out = runExecutorRaw(['start', '--task', outside], h);
  assert.equal(out.ok, false);
  assert.match(out.json.error, /inside repository work tree/);
});
