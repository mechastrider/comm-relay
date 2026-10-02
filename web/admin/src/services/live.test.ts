import { afterEach, expect, test, vi } from "vitest";
import { connectLive } from "./live";

class Socket extends EventTarget {
  close = vi.fn(() => this.dispatchEvent(new Event("close")));
  open() {
    this.dispatchEvent(new Event("open"));
  }
}
afterEach(() => vi.useRealTimers());
test("cleanup cancels reconnect and ignores late callbacks from the disposed socket", () => {
  vi.useFakeTimers();
  const sockets: Socket[] = [];
  const create = vi.fn(() => {
    const socket = new Socket();
    sockets.push(socket);
    return socket as unknown as WebSocket;
  });
  const onEvent = vi.fn();
  const onState = vi.fn();
  const stop = connectLive({
    url: "ws://localhost/ws",
    socket: create,
    onEvent,
    onState,
    onReconnect: vi.fn(),
  });
  stop();
  sockets[0].open();
  sockets[0].dispatchEvent(
    new MessageEvent("message", { data: '{"type":"message"}' }),
  );
  vi.runAllTimers();
  expect(create).toHaveBeenCalledTimes(1);
  expect(onEvent).not.toHaveBeenCalled();
  expect(onState).toHaveBeenCalledTimes(1);
});
test("reconnects once and requests reconciliation only after a subsequent successful connection", () => {
  vi.useFakeTimers();
  const sockets: Socket[] = [];
  const onReconnect = vi.fn();
  const stop = connectLive({
    url: "ws://localhost/ws",
    socket: () => {
      const socket = new Socket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    onEvent: vi.fn(),
    onState: vi.fn(),
    onReconnect,
  });
  sockets[0].open();
  expect(onReconnect).not.toHaveBeenCalled();
  sockets[0].close();
  vi.advanceTimersByTime(1000);
  sockets[1].open();
  expect(onReconnect).toHaveBeenCalledTimes(1);
  sockets[0].dispatchEvent(new Event("close"));
  vi.advanceTimersByTime(20_000);
  expect(sockets).toHaveLength(2);
  stop();
});
