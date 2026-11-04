// Keep Wails' runtime in the top-level document. Only our loopback admin frame
// can request the narrow save/audio operations; preview/third-party frames cannot.
let adminOrigin = "";
let saving = false;
let messageAudioModule;
const admin = document.getElementById("admin");
window.openAdmin = function (url) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname)
  )
    return;
  adminOrigin = parsed.origin;
  admin.src = parsed.href;
  admin.hidden = false;
  document.getElementById("starting").hidden = true;
};
window.addEventListener("message", function (event) {
  if (
    event.source !== admin.contentWindow ||
    event.origin !== adminOrigin ||
    !event.ports[0]
  )
    return;
  if (event.data?.type === "comm-relay:desktop-message-audio") {
    // Keep openAdmin synchronous: Wails can notify OnDomReady before deferred
    // module dependencies have evaluated. Load optional audio after navigation.
    messageAudioModule ??= import("./message-audio.js");
    void messageAudioModule.then(({ connectMessageAudio }) => {
      if (event.source === admin.contentWindow && event.origin === adminOrigin) {
        connectMessageAudio(event.ports[0], window.go?.main?.DesktopAPI);
      } else event.ports[0].close();
    }).catch((error) => {
      console.warn("Desktop message audio module failed", error);
      event.ports[0].postMessage({ available: false });
      event.ports[0].close();
    });
    return;
  }
  if (event.data?.type !== "comm-relay:desktop-save") return;
  const port = event.ports[0];
  const api = window.go?.main?.DesktopAPI;
  if (typeof api?.SavePNGFile !== "function") {
    port.postMessage({ available: false });
    port.close();
    return;
  }
  let used = false;
  port.onmessage = async function (request) {
    if (used) return;
    used = true;
    const args = request.data?.args;
    if (
      saving ||
      !Array.isArray(args) ||
      args.length !== 3 ||
      args.some((value) => typeof value !== "string") ||
      args[2].length > 28 * 1024 * 1024
    ) {
      port.postMessage({ error: "Invalid or concurrent save request" });
      port.close();
      return;
    }
    saving = true;
    try {
      port.postMessage({ path: await api.SavePNGFile(...args) });
    } catch (error) {
      port.postMessage({ error: String(error) });
    } finally {
      saving = false;
      port.close();
    }
  };
  port.postMessage({ available: true });
});
