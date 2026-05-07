const audioCache = new Map<string, HTMLAudioElement>();
const lastPlayed = new Map<string, number>();
const DEBOUNCE_MS = 500;

export function play(name: string, volume = 1.0) {
  const now = Date.now();
  if ((now - (lastPlayed.get(name) ?? 0)) < DEBOUNCE_MS) return;
  lastPlayed.set(name, now);

  let el = audioCache.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.mp3`);
    audioCache.set(name, el);
  }
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  el.play().catch(() => { /* ignored: file missing or autoplay-blocked */ });
}
