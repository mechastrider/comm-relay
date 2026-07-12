import { state } from './state.js';
import { INITIAL_WS_RECONNECT_MS, MAX_WS_RECONNECT_MS } from './constants.js';
import { handleWireMessage } from './messages.js';

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
    state.wsReconnectTimer = window.setTimeout(function () {
      state.wsReconnectTimer = null;
      connectMessageWebSocket();
    }, state.wsReconnectDelayMs);
    state.wsReconnectDelayMs = Math.min(state.wsReconnectDelayMs * 2, MAX_WS_RECONNECT_MS);
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

    socket.addEventListener("open", function () {
      state.wsReconnectDelayMs = INITIAL_WS_RECONNECT_MS;
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
      scheduleWSReconnect();
    });

    socket.addEventListener("error", function () {
      socket.close();
    });
  }

export function disconnectMessageWebSocket() {
    state.wsShouldRun = false;
    clearWSReconnectTimer();
    if (state.wsSocket) {
      state.wsSocket.close();
      state.wsSocket = null;
    }
  }
