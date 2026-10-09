export function formatTimecode(seconds: number, fps: number = 30): string {
  const safeSeconds = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const totalFrames = Math.floor(safeSeconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(safeSeconds);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}s`;
}

export function parseTimecode(tc: string, fps: number = 30): number {
  const parts = tc.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 4) {
    const [h, m, s, f] = parts;
    return h * 3600 + m * 60 + s + f / fps;
  }
  return 0;
}
