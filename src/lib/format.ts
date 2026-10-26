export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatSpeedMult(s: number): string {
  if (s >= 1000) {
    const k = s / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k×`;
  }
  return `${Math.round(s)}×`;
}

/** Simulated elapsed time as T+HH:MM:SS. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `T+${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function formatArea(km2: number): string {
  if (km2 >= 1e6) return `≈${(km2 / 1e6).toFixed(1)} million km²`;
  return `≈${Math.round(km2).toLocaleString("en-US")} km²`;
}

export function formatLat(deg: number): string {
  return `${Math.abs(deg).toFixed(1)}° ${deg >= 0 ? "N" : "S"}`;
}

export function formatLon(deg: number): string {
  return `${Math.abs(deg).toFixed(1)}° ${deg >= 0 ? "E" : "W"}`;
}
