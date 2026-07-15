#!/usr/bin/env node
import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCRIPT = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';

const argv = process.argv;
const scenario = process.env.FAKE_AGENT_SCENARIO || 'success';
const argvLog = process.env.FAKE_AGENT_ARGV_LOG;
const touchPath = process.env.FAKE_AGENT_TOUCH_PATH;
const delayMs = Number(process.env.FAKE_AGENT_DELAY_MS || 0);

if (argvLog) {
  appendFileSync(argvLog, JSON.stringify(argv) + '\\n', 'utf8');
}

if (argv.includes('--version') || argv.includes('-v')) {
  console.log('fake-cursor-agent 1.0.0');
  process.exit(0);
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('stream-json text json');
  process.exit(0);
}

if (argv[2] === 'status' || argv[2] === 'whoami') {
  if (process.env.FAKE_AGENT_AUTH === 'fail') {
    console.log('Not logged in');
    process.exit(1);
  }
  console.log('✓ Logged in as test@example.com');
  process.exit(0);
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (touchPath) {
    appendFileSync(touchPath, 'touched\\n', 'utf8');
  }
  if (delayMs > 0) {
    await sleep(delayMs);
  }

  switch (scenario) {
    case 'malformed':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-mal', model: 'Composer 2.5' });
      process.stdout.write('NOT JSON\\n');
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'ok' });
      return process.exit(0);
    case 'unknown':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-unknown', model: 'Composer 2.5' });
      emit({ type: 'future_event', subtype: 'beta', data: { TOKEN_VALUE: process.env.MY_API_TOKEN || 'x' } });
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'ok' });
      return process.exit(0);
    case 'no-result':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-nr', model: 'Composer 2.5' });
      emit({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'partial' }] } });
      return process.exit(0);
    case 'hang-after-result':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-hang', model: 'Composer 2.5' });
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'done-hanging' });
      await new Promise(() => {});
    case 'slow':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-slow', model: 'Composer 2.5' });
      await sleep(30_000);
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'late' });
      return process.exit(0);
    case 'cancel-me':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-cancel', model: 'Composer 2.5' });
      await new Promise(() => {});
    case 'stderr-secret':
      process.stderr.write('MY_API_TOKEN=' + (process.env.MY_API_TOKEN || 'secret-value') + '\\n');
      process.stderr.write((process.env.MY_API_TOKEN || 'secret-value') + '\\n');
      emit({ type: 'system', subtype: 'init', session_id: 'sess-sec', model: 'Composer 2.5' });
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'ok' });
      return process.exit(0);
    case 'resume':
      emit({ type: 'system', subtype: 'init', session_id: 'sess-resumed', model: 'Composer 2.5' });
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'resumed-ok' });
      return process.exit(0);
    default:
      emit({ type: 'system', subtype: 'init', session_id: 'sess-1', model: 'Composer 2.5' });
      emit({ type: 'result', subtype: 'success', is_error: false, result: 'done' });
      return process.exit(0);
  }
}

main();
`;

export function installFakeAgent(binDir) {
  mkdirSync(binDir, { recursive: true });
  const scriptPath = join(binDir, 'cursor-agent');
  writeFileSync(scriptPath, SCRIPT, { mode: 0o755 });
  return scriptPath;
}

export function installBrokenAgent(binDir) {
  mkdirSync(binDir, { recursive: true });
  const scriptPath = join(binDir, 'cursor-agent');
  writeFileSync(scriptPath, '#!/bin/sh\nexit 127\n', { mode: 0o755 });
  return scriptPath;
}
