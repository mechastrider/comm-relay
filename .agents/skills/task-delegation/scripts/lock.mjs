import { readJson, writeJsonAtomic } from './atomic.mjs';
import { ensureDirExists, getLockPath, getRepoJobsDir } from './paths.mjs';
import { readJob, writeJob, listJobIds } from './jobs.mjs';
import { JOB_STATUS, MALFORMED_LOCK_TTL_MS } from './constants.mjs';

export function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getMalformedLockTtlMs() {
  const override = Number(process.env.CURSOR_EXECUTOR_MALFORMED_LOCK_TTL_MS);
  return Number.isFinite(override) && override > 0
    ? override
    : MALFORMED_LOCK_TTL_MS;
}

function removeLockFile(fs, repoRoot) {
  const lockPath = getLockPath(repoRoot);
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

export function inspectLock(fs, repoRoot) {
  const lockPath = getLockPath(repoRoot);
  if (!fs.existsSync(lockPath)) {
    return { exists: false };
  }
  const stat = fs.statSync(lockPath);
  const ageMs = Date.now() - stat.mtimeMs;
  try {
    const payload = readJson(fs, lockPath);
    if (!payload || typeof payload !== 'object' || !payload.jobId) {
      return { exists: true, malformed: true, ageMs };
    }
    return { exists: true, payload, ageMs };
  } catch {
    return { exists: true, malformed: true, ageMs };
  }
}

function markInterruptedJobs(fs, repoRoot, lock) {
  if (!lock?.jobId) return;
  const candidates = new Set([lock.jobId]);
  for (const jobId of listJobIds(fs, repoRoot)) {
    candidates.add(jobId);
  }
  for (const jobId of candidates) {
    let job;
    try {
      job = readJob(fs, repoRoot, jobId);
    } catch {
      continue;
    }
    if (job.status !== JOB_STATUS.RUNNING && job.status !== JOB_STATUS.PENDING) {
      continue;
    }
    if (lock.jobId && job.jobId !== lock.jobId && job.wrapperPid !== lock.wrapperPid) {
      continue;
    }
    job.status = JOB_STATUS.INTERRUPTED;
    job.summary = job.summary ?? 'Writer lock reconciled after wrapper crash';
    job.endedAt = new Date().toISOString();
    writeJob(fs, repoRoot, job);
  }
}

function evaluateRecoverableLock(fs, repoRoot, lockInfo, ttlMs) {
  if (!lockInfo.exists) {
    return { action: 'acquire' };
  }
  if (lockInfo.malformed) {
    if (lockInfo.ageMs < ttlMs) {
      return { action: 'reject', lock: { malformed: true, partial: true } };
    }
    removeLockFile(fs, repoRoot);
    return { action: 'acquire' };
  }
  const wrapperAlive = isProcessAlive(lockInfo.payload.wrapperPid);
  const childAlive = isProcessAlive(lockInfo.payload.childPid);
  if (wrapperAlive || childAlive) {
    return { action: 'reject', lock: lockInfo.payload };
  }
  markInterruptedJobs(fs, repoRoot, lockInfo.payload);
  removeLockFile(fs, repoRoot);
  return { action: 'acquire' };
}

export function readLock(fs, repoRoot) {
  const lockInfo = inspectLock(fs, repoRoot);
  if (!lockInfo.exists) return null;
  if (lockInfo.malformed) return { malformed: true };
  return lockInfo.payload;
}

export function writeLock(fs, repoRoot, lock) {
  writeJsonAtomic(fs, getLockPath(repoRoot), lock);
}

export function reconcileStaleLock(fs, repoRoot) {
  const ttlMs = getMalformedLockTtlMs();
  const lockInfo = inspectLock(fs, repoRoot);
  if (!lockInfo.exists) {
    return { reconciled: false, lock: null };
  }
  if (lockInfo.malformed) {
    if (lockInfo.ageMs < ttlMs) {
      return { reconciled: false, lock: { malformed: true }, stale: false };
    }
    removeLockFile(fs, repoRoot);
    return { reconciled: true, lock: null, stale: true, malformed: true };
  }
  const wrapperAlive = isProcessAlive(lockInfo.payload.wrapperPid);
  const childAlive = isProcessAlive(lockInfo.payload.childPid);
  if (!wrapperAlive && !childAlive) {
    markInterruptedJobs(fs, repoRoot, lockInfo.payload);
    removeLockFile(fs, repoRoot);
    return { reconciled: true, lock: lockInfo.payload, stale: true };
  }
  return { reconciled: false, lock: lockInfo.payload, stale: false };
}

export function acquireWriterLock(fs, repoRoot, { jobId, wrapperPid, childPid }) {
  reconcileStaleLock(fs, repoRoot);
  ensureDirExists(fs, getRepoJobsDir(repoRoot));

  const ttlMs = getMalformedLockTtlMs();
  const lockPath = getLockPath(repoRoot);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const lockInfo = inspectLock(fs, repoRoot);
    const decision = evaluateRecoverableLock(fs, repoRoot, lockInfo, ttlMs);
    if (decision.action === 'reject') {
      return { ok: false, lock: decision.lock };
    }

    const lock = {
      jobId,
      wrapperPid,
      childPid: childPid ?? null,
      acquiredAt: new Date().toISOString(),
    };

    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
      } finally {
        fs.closeSync(fd);
      }
      return { ok: true, lock };
    } catch (error) {
      if (error.code === 'EEXIST') {
        continue;
      }
      throw error;
    }
  }

  const existing = inspectLock(fs, repoRoot);
  return {
    ok: false,
    lock: existing.payload ?? { malformed: existing.malformed ?? true },
  };
}

export function releaseLock(fs, repoRoot, jobId) {
  const lockInfo = inspectLock(fs, repoRoot);
  if (!lockInfo.exists) return;
  if (lockInfo.malformed) return;
  if (lockInfo.payload?.jobId === jobId) {
    removeLockFile(fs, repoRoot);
  }
}

export function updateLockWrapperPid(fs, repoRoot, jobId, wrapperPid) {
  const lockInfo = inspectLock(fs, repoRoot);
  if (!lockInfo.exists || lockInfo.malformed || lockInfo.payload?.jobId !== jobId) {
    return;
  }
  lockInfo.payload.wrapperPid = wrapperPid;
  writeLock(fs, repoRoot, lockInfo.payload);
}

export function updateLockChildPid(fs, repoRoot, jobId, childPid) {
  const lockInfo = inspectLock(fs, repoRoot);
  if (!lockInfo.exists || lockInfo.malformed || lockInfo.payload?.jobId !== jobId) {
    return;
  }
  lockInfo.payload.childPid = childPid;
  writeLock(fs, repoRoot, lockInfo.payload);
}
