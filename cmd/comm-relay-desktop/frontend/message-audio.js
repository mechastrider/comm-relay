import { createMessageAudio } from "/shared/message-audio.js";

const audio = createMessageAudio();
let connection = null;

// Invoked only by fixed native WindowExecJS calls, not through postMessage:
// WebKitGTK treats native evaluation as activation in this top-level document.
window.prepareMessageAudio = function () {
  const current = connection;
  void audio.unlock().then(() => {
    if (current && current === connection) current.postMessage({ available: true });
  }).catch((error) => {
    console.warn("Desktop message audio activation failed", error);
    if (current && current === connection) current.postMessage({ available: false });
  });
};
window.playDesktopMessageSound = function (sound, volume) {
  // Resume for future events after suspension; never queue the current tone.
  void audio.unlock().catch((error) => console.warn("Desktop message audio recovery failed", error));
  audio.play(sound, volume);
};

export function connectMessageAudio(port, api) {
  if (typeof api?.PrepareMessageAudio !== "function" || typeof api?.PlayMessageSound !== "function") {
    port.postMessage({ available: false });
    port.close();
    return;
  }
  connection?.close();
  connection = port;
  port.onmessage = function (event) {
    if (connection !== port) return;
    const data = event.data;
    if (data?.type === "close") { port.close(); connection = null; return; }
    if (data?.type === "prepare") {
      void api.PrepareMessageAudio().catch((error) => console.warn("Desktop message audio preparation failed", error));
    } else if (data?.type === "play" && ["chime", "ping", "soft", "alert"].includes(data.sound) &&
      Number.isFinite(data.volume) && data.volume > 0 && data.volume <= 1) {
      void api.PlayMessageSound(data.sound, data.volume).catch((error) => console.warn("Desktop message sound failed", error));
    }
  };
  void api.PrepareMessageAudio().catch((error) => {
    console.warn("Desktop message audio preparation failed", error);
    if (connection === port) { port.postMessage({ available: false }); port.close(); connection = null; }
  });
}
window.addEventListener("pagehide", () => { connection?.close(); connection = null; audio.close(); });
