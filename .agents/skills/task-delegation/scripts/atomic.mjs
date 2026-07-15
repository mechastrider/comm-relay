import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';

export function writeJsonAtomic(fs, targetPath, data) {
  const dir = dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, targetPath);
}

export function readJson(fs, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}
