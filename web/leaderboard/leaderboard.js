"use strict";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const LEADERBOARD_PERIODS = new Set(["session", "day", "all"]);

const root = document.getElementById("leaderboard");
const params = new URLSearchParams(window.location.search);

function normalizePeriod(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return LEADERBOARD_PERIODS.has(value) ? value : "session";
}

const period = normalizePeriod(params.get("period"));

let socket = null;
let reconnectTimer = null;
let reconnectDelayMs = INITIAL_RECONNECT_MS;
let shouldRun = true;

function wsURL() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/ws";
}

function escapeText(value) {
  return String(value == null ? "" : value);
}

function renderEntries(entries) {
  if (!root) {
    return;
  }

  root.textContent = "";
  const list = document.createElement("ol");
  list.className = "leaderboard-list";

  (entries || []).forEach(function (entry) {
    const item = document.createElement("li");
    item.className = "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(entry.rank || "");

    const body = document.createElement("div");
    body.className = "leaderboard-body";

    const nameRow = document.createElement("div");
    nameRow.className = "leaderboard-name-row";

    if (entry.avatar_url) {
      const avatar = document.createElement("img");
      avatar.className = "leaderboard-avatar";
      avatar.src = entry.avatar_url;
      avatar.alt = "";
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      nameRow.append(avatar);
    }

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = escapeText(entry.display_name || "—");
    nameRow.append(name);

    const stats = document.createElement("span");
    stats.className = "leaderboard-stats";
    stats.textContent = String(entry.score || 0) + " · " + String(entry.message_count || 0) + " msg";

    body.append(nameRow, stats);
    item.append(rank, body);
    list.append(item);
  });

  root.append(list);
}

async function loadSnapshot() {
  try {
    const response = await fetch("/api/leaderboard?period=" + encodeURIComponent(period));
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    if (payload && payload.period === period && Array.isArray(payload.entries)) {
      renderEntries(payload.entries);
    }
  } catch {
    /* WebSocket may still deliver updates */
  }
}

function handleSocketMessage(event) {
  let frame;
  try {
    frame = JSON.parse(event.data);
  } catch {
    return;
  }
  if (!frame || frame.type !== "leaderboard" || frame.period !== period) {
    return;
  }
  renderEntries(frame.entries);
}

function scheduleReconnect() {
  if (!shouldRun || reconnectTimer !== null) {
    return;
  }
  reconnectTimer = window.setTimeout(function () {
    reconnectTimer = null;
    connect();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS);
}

function connect() {
  if (!shouldRun) {
    return;
  }
  socket = new WebSocket(wsURL());
  socket.addEventListener("open", function () {
    reconnectDelayMs = INITIAL_RECONNECT_MS;
  });
  socket.addEventListener("message", handleSocketMessage);
  socket.addEventListener("close", function () {
    socket = null;
    scheduleReconnect();
  });
  socket.addEventListener("error", function () {
    if (socket) {
      socket.close();
    }
  });
}

loadSnapshot().finally(function () {
  connect();
});

window.addEventListener("beforeunload", function () {
  shouldRun = false;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
  }
  if (socket) {
    socket.close();
  }
});
