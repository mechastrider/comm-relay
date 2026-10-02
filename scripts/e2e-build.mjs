import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const out = join(tmpdir(), 'comm-relay-e2e-bin');
mkdirSync(out, { recursive: true });
for (const name of ['server']) {
  const result = spawnSync('go', ['build', '-o', join(out, name + (process.platform === 'win32' ? '.exe' : '')), './cmd/comm-relay-' + name], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
