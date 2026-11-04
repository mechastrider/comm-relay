import { createMessageAudio } from "../../../shared/message-audio.js";
import { connectDesktopMessageAudio } from "./desktop-message-audio";

const browser = createMessageAudio();
let desktop: MessagePort | null = null;
let initializing: Promise<void> | null = null;
let generation = 0;

/** Negotiate with the trusted shell before the first live notification. */
export function initAudio() {
  if (initializing) return initializing;
  const current = generation;
  initializing = connectDesktopMessageAudio().then((port) => {
    if (current !== generation) { port?.close(); return; }
    desktop = port;
  });
  return initializing;
}

export async function unlockAudio() {
  const current = generation;
  await initAudio();
  if (current !== generation) return;
  if (desktop) desktop.postMessage({ type: "prepare" });
  else await browser.unlock();
}

export function closeAudio() {
  generation++;
  desktop?.postMessage({ type: "close" });
  desktop?.close();
  desktop = null;
  initializing = null;
  browser.close();
}

export function playSound(sound: string, volume: number) {
  if (desktop) desktop.postMessage({ type: "play", sound, volume });
  else browser.play(sound, volume);
}
