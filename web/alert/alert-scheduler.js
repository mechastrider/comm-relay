const DEFAULT_MAX_PENDING = 20;
const DEFAULT_COMMAND_TTL_MS = 10_000;

function nonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Keep older command frames working: source and created_at were absent before
// the stable envelope, so they retain command scheduling and receive time.
// Avatar, quote, and sound are presentation-only optional fields.
export function isValidAlertEnvelope(alert) {
  if (!alert || typeof alert !== "object" || Array.isArray(alert)) {
    return false;
  }
  if (!nonBlankString(alert.name) || typeof alert.text !== "string") {
    return false;
  }
  if (!Number.isFinite(alert.points) || !Number.isFinite(alert.duration_ms) || alert.duration_ms <= 0) {
    return false;
  }
  return alert.source !== "award" || (
    alert.points > 0 && nonBlankString(alert.award_id) && nonBlankString(alert.award_name)
  );
}

function laneFor(alert) {
  return alert && alert.source === "award" ? "award" : "command";
}

function createdAtMs(alert, receivedAt) {
  if (alert && typeof alert.created_at === "string") {
    const parsed = Date.parse(alert.created_at);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return receivedAt;
}

/**
 * Keeps alert delivery page-local: one visible item and two FIFO pending lanes.
 * The injected clock makes expiry deterministic without coupling it to DOM timers.
 */
export function createAlertScheduler(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const maxPending = options.maxPending || DEFAULT_MAX_PENDING;
  const commandTTLms = options.commandTTLms || DEFAULT_COMMAND_TTL_MS;
  let visible = null;
  const awards = [];
  const commands = [];

  function isExpiredCommand(item, current) {
    return item.lane === "command" && current - item.scheduledAt > commandTTLms;
  }

  function removeExpiredCommands() {
    const current = now();
    const active = commands.filter(function (item) {
      return !isExpiredCommand(item, current);
    });
    commands.splice(0, commands.length, ...active);
  }

  function pendingCount() {
    return awards.length + commands.length;
  }

  function takeNext() {
    if (visible) {
      return null;
    }
    removeExpiredCommands();
    visible = awards.shift() || commands.shift() || null;
    return visible ? visible.alert : null;
  }

  function insert(item) {
    removeExpiredCommands();
    if (item.lane === "award") {
      if (pendingCount() >= maxPending) {
        if (commands.length > 0) {
          commands.shift();
        } else {
          awards.shift();
        }
      }
      awards.push(item);
      return true;
    }

    if (pendingCount() >= maxPending) {
      if (commands.length === 0) {
        return false;
      }
      commands.shift();
    }
    commands.push(item);
    return true;
  }

  return {
    enqueue(alert) {
      if (!isValidAlertEnvelope(alert)) {
        return null;
      }
      const receivedAt = now();
      const item = {
        alert,
        lane: laneFor(alert),
        scheduledAt: createdAtMs(alert, receivedAt),
      };

      if (isExpiredCommand(item, receivedAt)) {
        return null;
      }
      removeExpiredCommands();
      if (!visible) {
        insert(item);
        return takeNext();
      }
      insert(item);
      return null;
    },

    completeVisible() {
      visible = null;
      return takeNext();
    },

    reset() {
      visible = null;
      awards.splice(0, awards.length);
      commands.splice(0, commands.length);
    },

    snapshot() {
      removeExpiredCommands();
      return {
        visible: visible ? visible.alert : null,
        awards: awards.map(function (item) {
          return item.alert;
        }),
        commands: commands.map(function (item) {
          return item.alert;
        }),
      };
    },
  };
}
