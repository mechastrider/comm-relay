let context: AudioContext | null = null;
export async function unlockAudio() {
  context ??= new AudioContext();
  if (context.state === "suspended") await context.resume();
}
export function closeAudio() {
  const current = context;
  context = null;
  if (current) void current.close();
}
export function playSound(sound: string, volume: number) {
  if (!context || context.state !== "running" || volume <= 0) return;
  const ctx = context;
  const peak = Math.max(0.0001, volume * 0.18);
  function tone(
    offset: number,
    frequency: number,
    duration: number,
    triangle = false,
    end?: number,
  ) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + offset;
    oscillator.type = triangle ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (end)
      oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      triangle ? peak * 0.7 : peak,
      start + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  if (sound === "ping") tone(0, 1200, 0.1);
  else if (sound === "soft") tone(0, 440, 0.16, true);
  else if (sound === "alert") {
    tone(0, 880, 0.08);
    tone(0.1, 880, 0.08);
  } else tone(0, 880, 0.14, false, 660);
}
