/** The shell owns audio because native WebKit activation does not cross frames. */
export function connectDesktopMessageAudio(): Promise<MessagePort | null> {
  if (window.parent === window || typeof MessageChannel !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const port = channel.port1;
    const timer = setTimeout(() => { port.close(); resolve(null); }, 3000);
    port.onmessage = (event) => {
      clearTimeout(timer);
      port.onmessage = null;
      if (event.data?.available === true) resolve(port);
      else { port.close(); resolve(null); }
    };
    const origin = /Windows/.test(navigator.userAgent) ? "http://wails.localhost" : "wails://wails";
    try {
      window.parent.postMessage({ type: "comm-relay:desktop-message-audio" }, origin, [channel.port2]);
    } catch {
      clearTimeout(timer);
      port.close();
      channel.port2.close();
      resolve(null);
    }
  });
}
