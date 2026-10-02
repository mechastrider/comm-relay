export interface WireEvent {
  type: string;
  [key: string]: unknown;
}
export type ConnectionState = "connecting" | "connected" | "reconnecting";

/** A single owner with generation-safe teardown, also safe under StrictMode. */
export function connectLive(options: {
  onEvent: (event: WireEvent) => void;
  onState: (state: ConnectionState) => void;
  onReconnect: () => void;
  socket?: (url: string) => WebSocket;
  url?: string;
}) {
  let stopped = false;
  let active: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let delay = 1000;
  let opened = false;
  const createSocket = options.socket ?? ((url) => new WebSocket(url));
  const url =
    options.url ??
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
  const retry = () => {
    if (stopped || timer !== undefined) return;
    options.onState("reconnecting");
    timer = setTimeout(() => {
      timer = undefined;
      connect();
    }, delay);
    delay = Math.min(delay * 2, 30_000);
  };
  const connect = () => {
    if (stopped) return;
    let socket: WebSocket;
    try {
      socket = createSocket(url);
    } catch {
      retry();
      return;
    }
    active = socket;
    socket.addEventListener("open", () => {
      if (stopped || active !== socket) return;
      delay = 1000;
      options.onState("connected");
      if (opened) options.onReconnect();
      opened = true;
    });
    socket.addEventListener("message", (event) => {
      if (stopped || active !== socket) return;
      let frame: unknown;
      try {
        frame = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (
        frame &&
        typeof frame === "object" &&
        "type" in frame &&
        typeof frame.type === "string"
      )
        options.onEvent(frame as WireEvent);
    });
    socket.addEventListener("close", () => {
      if (stopped || active !== socket) return;
      active = null;
      retry();
    });
    socket.addEventListener("error", () => {
      if (!stopped && active === socket) socket.close();
    });
  };
  options.onState("connecting");
  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    timer = undefined;
    active?.close();
    active = null;
  };
}
