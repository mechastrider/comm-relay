// Keep Wails' runtime in the top-level document. Only our loopback admin frame
// can request the narrow PNG-save operation; preview/third-party frames cannot.
let adminOrigin = "";
let saving = false;
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
    event.data?.type !== "comm-relay:desktop-save" ||
    !event.ports[0]
  )
    return;
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
