const SENSITIVE_NAME = /(TOKEN|KEY|SECRET|PASSWORD)/i;

let cachedSensitiveValues = null;

export function isSensitiveEnvName(name) {
  return SENSITIVE_NAME.test(String(name));
}

export function collectSensitiveEnvValues(env = process.env) {
  const values = new Set();
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue;
    if (isSensitiveEnvName(name)) {
      values.add(value);
    }
  }
  return [...values].sort((a, b) => b.length - a.length);
}

export function getSensitiveEnvValues(env = process.env) {
  if (!cachedSensitiveValues) {
    cachedSensitiveValues = collectSensitiveEnvValues(env);
  }
  return cachedSensitiveValues;
}

export function resetSensitiveEnvCache() {
  cachedSensitiveValues = null;
}

function redactBareSecrets(value, sensitiveValues) {
  let out = value;
  for (const secret of sensitiveValues) {
    if (secret.length > 0 && out.includes(secret)) {
      out = out.split(secret).join('[REDACTED]');
    }
  }
  return out;
}

export function redactString(value, env = process.env) {
  if (typeof value !== 'string') {
    return value;
  }
  const sensitiveValues = getSensitiveEnvValues(env);
  let out = value.replace(
    /([A-Za-z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD)[A-Za-z0-9_]*)=([^\s"'\\]+)/gi,
    '$1=[REDACTED]',
  );
  out = redactBareSecrets(out, sensitiveValues);
  return out;
}

export function redactValue(value, env = process.env) {
  if (typeof value === 'string') {
    return redactString(value, env);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, env));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (isSensitiveEnvName(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactValue(child, env);
      }
    }
    return out;
  }
  return value;
}

export function redactForPersistence(data, env = process.env) {
  return redactValue(data, env);
}
