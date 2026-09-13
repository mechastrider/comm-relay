import { state } from './state.js';
import { INITIAL_WS_RECONNECT_MS, MAX_WS_RECONNECT_MS } from './constants.js';
import { handleWireMessage } from './messages.js';
import { reconcileActiveLiveData } from "./live-tabs.js";
import * as dom from "./dom.js";
import { t } from "./i18n-ui.js";

export function wsURL() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.host + "/ws";
  }

export function clearWSReconnectTimer() {
    if (state.wsReconnectTimer !== null) {
      window.clearTimeout(state.wsReconnectTimer);
      state.wsReconnectTimer = null;
    }
  }

export function scheduleWSReconnect() {
    if (!state.wsShouldRun || state.wsReconnectTimer !== null) {
      return;
    }
    state.wsConnected = false;
    renderAdminConnectionState();
    state.wsReconnectTimer = window.setTimeout(function () {
      state.wsReconnectTimer = null;
      connectMessageWebSocket();
    }, state.wsReconnectDelayMs);
    state.wsReconnectDelayMs = Math.min(state.wsReconnectDelayMs * 2, MAX_WS_RECONNECT_MS);
    renderAdminConnectionState();
  }

export function renderAdminConnectionState() {
    if (!dom.diagAdminWs) {
      return;
    }
    let label = t("shell.adminWsDisconnected");
    let className = "status-pill--error";
    if (state.wsConnected) {
      label = t("shell.adminWsConnected");
      className = "status-pill--connected";
    } else if (state.wsReconnectTimer !== null) {
      label = t("shell.adminWsReconnecting");
      className = "status-pill--reconnecting";
    }
    dom.diagAdminWs.textContent = label;
    dom.diagAdminWs.className = "status-pill " + className;
    if (dom.diagStaleNotice) {
      dom.diagStaleNotice.hidden = !(state.statusPollStale || state.messagesPollStale);
    }
  }

export function connectMessageWebSocket() {
    if (!state.wsShouldRun || state.wsSocket) {
      return;
    }

    let socket;
    try {
      socket = new WebSocket(wsURL());
    } catch {
      scheduleWSReconnect();
      return;
    }

    state.wsSocket = socket;
    state.wsConnected = false;
    renderAdminConnectionState();

    socket.addEventListener("open", function () {
      state.wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
      state.wsConnected = true;
      renderAdminConnectionState();
      reconcileActiveLiveData();
    });

    socket.addEventListener("message", function (event) {
      let wire = null;
      try {
        wire = JSON.parse(event.data);
      } catch {
        return;
      }
      handleWireMessage(wire);
    });

    socket.addEventListener("close", function () {
      if (state.wsSocket === socket) {
        state.wsSocket = null;
      }
      state.wsConnected = false;
      renderAdminConnectionState();
      scheduleWSReconnect();
    });

    socket.addEventListener("error", function () {
      socket.close();
    });
  }

export function disconnectMessageWebSocket() {
    state.wsShouldRun = false;
    clearWSReconnectTimer();
    state.wsConnected = false;
    renderAdminConnectionState();
    if (state.wsSocket) {
      state.wsSocket.close();
      state.wsSocket = null;
    }
  }
