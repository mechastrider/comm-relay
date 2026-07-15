import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function parsePorcelain(output) {
  const paths = new Set();
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const entry = line.slice(3).trim();
    if (!entry) continue;
    const path = entry.includes(' -> ') ? entry.split(' -> ').pop() : entry;
    if (path) paths.add(path);
  }
  return [...paths].sort();
}

export function snapshotDirtyPaths(repoRoot) {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return parsePorcelain(out);
  } catch {
    return [];
  }
}

export function snapshotPathHashes(repoRoot, paths) {
  const hashes = {};
  for (const relPath of paths) {
    try {
      const content = readFileSync(join(repoRoot, relPath), 'utf8');
      hashes[relPath] = createHash('sha256').update(content).digest('hex');
    } catch {
      hashes[relPath] = null;
    }
  }
  return hashes;
}

export function snapshotChangedPaths(repoRoot, baselinePaths) {
  const current = new Set(snapshotDirtyPaths(repoRoot));
  const baseline = new Set(baselinePaths);
  const changed = new Set();
  for (const path of current) {
    if (!baseline.has(path)) changed.add(path);
  }
  for (const path of baseline) {
    if (!current.has(path)) changed.add(path);
  }
  return [...changed].sort();
}

export function snapshotTouchedFiles(repoRoot, baselinePaths, baselineHashes) {
  const currentDirty = snapshotDirtyPaths(repoRoot);
  const candidates = new Set([...baselinePaths, ...currentDirty]);
  const touched = new Set();

  for (const relPath of candidates) {
    let currentHash;
    try {
      const content = readFileSync(join(repoRoot, relPath), 'utf8');
      currentHash = createHash('sha256').update(content).digest('hex');
    } catch {
      if (baselineHashes[relPath] != null) {
        touched.add(relPath);
      }
      continue;
    }

    const startHash = baselineHashes[relPath];
    if (startHash == null) {
      touched.add(relPath);
    } else if (startHash !== currentHash) {
      touched.add(relPath);
    }
  }

  return [...touched].sort();
}
