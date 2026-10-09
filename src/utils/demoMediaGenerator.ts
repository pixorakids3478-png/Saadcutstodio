/**
 * Generates sample cinematic stock media clips completely offline using HTML5 Canvas & MediaRecorder
 * Ensures the user has instant playable, trimmable, color-gradable video items out of the box.
 */
import { MediaItem } from '../types/editor';

export async function generateDemoVideoClip(theme: 'cyberpunk' | 'cinematic_sunset' | 'urban_motion'): Promise<MediaItem> {
  const width = 1280;
  const height = 720;
  const fps = 30;
  const duration = 6.0; // 6 seconds
  const totalFrames = fps * duration;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw initial frame for thumbnail
  drawFrame(ctx, width, height, 0, theme);
  const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

  // If MediaRecorder is supported, record actual video blob
  return new Promise((resolve) => {
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(fps);
    } catch {
      // Fallback to static image media item if captureStream fails
      const fallbackBlob = dataURLToBlob(thumbnail);
      resolve({
        id: `demo_${theme}_${Date.now()}`,
        name: getThemeTitle(theme),
        type: 'video',
        url: URL.createObjectURL(fallbackBlob),
        duration: duration,
        width,
        height,
        thumbnail,
        fps,
        addedAt: Date.now(),
      });
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve({
        id: `demo_${theme}_${Date.now()}`,
        name: getThemeTitle(theme),
        type: 'video',
        url,
        duration,
        width,
        height,
        thumbnail,
        fps,
        size: blob.size,
        addedAt: Date.now(),
      });
    };

    mediaRecorder.start();

    let frame = 0;
    const interval = setInterval(() => {
      drawFrame(ctx, width, height, frame / totalFrames, theme);
      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      }
    }, 1000 / fps);
  });
}

function getThemeTitle(theme: string): string {
  switch (theme) {
    case 'cyberpunk':
      return 'Cinematic_Neon_City_Night_1080p.mp4';
    case 'cinematic_sunset':
      return 'Golden_Hour_Coastal_Landscape.mp4';
    case 'urban_motion':
      return 'Modern_Architecture_Timelapse.mp4';
    default:
      return 'Demo_Footage.mp4';
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, theme: string) {
  ctx.save();

  if (theme === 'cyberpunk') {
    // Cyberpunk neon grid & glowing orbs
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a14');
    grad.addColorStop(0.5, '#120b22');
    grad.addColorStop(1, '#05020c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Glowing horizon line
    const horizon = h * 0.65;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    // Perspective grid moving towards viewer
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.4)';
    ctx.lineWidth = 1.5;
    const offset = (progress * 80) % 40;
    for (let y = horizon; y < h; y += 15 + (y - horizon) * 0.35) {
      const drawnY = y + offset * ((y - horizon) / (h - horizon));
      if (drawnY <= h) {
        ctx.beginPath();
        ctx.moveTo(0, drawnY);
        ctx.lineTo(w, drawnY);
        ctx.stroke();
      }
    }

    // Converging perspective lines
    for (let x = -w * 0.5; x <= w * 1.5; x += 100) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Neon Sun in background
    const sunY = horizon - 120 + Math.sin(progress * Math.PI) * 10;
    const sunGrad = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, 130);
    sunGrad.addColorStop(0, '#ffe600');
    sunGrad.addColorStop(0.5, '#ff007f');
    sunGrad.addColorStop(1, 'rgba(128, 0, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 130, 0, Math.PI * 2);
    ctx.fill();

    // Floating particles
    ctx.fillStyle = '#00ffff';
    for (let i = 0; i < 20; i++) {
      const px = ((i * 137.5 + progress * 200) % w);
      const py = ((i * 73.1 + progress * 50) % horizon);
      const pr = 1.5 + (i % 3);
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'cinematic_sunset') {
    // Golden Hour coastal gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1c1938');
    sky.addColorStop(0.35, '#d94b41');
    sky.addColorStop(0.7, '#f79d39');
    sky.addColorStop(1, '#2c1e3b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun with rays
    const sunX = w * 0.45 + Math.sin(progress * Math.PI) * 30;
    const sunY = h * 0.52;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 180);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.2, '#fff176');
    sunGrad.addColorStop(0.6, 'rgba(255, 138, 101, 0.4)');
    sunGrad.addColorStop(1, 'rgba(255, 112, 67, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Sea horizon and water reflections
    const seaY = h * 0.6;
    ctx.fillStyle = '#1c1b2f';
    ctx.fillRect(0, seaY, w, h - seaY);

    // Water shimmer lines
    ctx.fillStyle = 'rgba(255, 214, 102, 0.35)';
    for (let i = 0; i < 30; i++) {
      const wy = seaY + (i / 30) * (h - seaY);
      const waveW = 80 + i * 15 + Math.sin(progress * 10 + i) * 20;
      ctx.fillRect(sunX - waveW * 0.5, wy, waveW, 2 + i * 0.1);
    }

    // Mountain silhouettes
    ctx.fillStyle = '#0c0b16';
    ctx.beginPath();
    ctx.moveTo(0, seaY);
    ctx.lineTo(w * 0.25, seaY - 140);
    ctx.lineTo(w * 0.5, seaY);
    ctx.lineTo(w * 0.75, seaY - 190);
    ctx.lineTo(w, seaY - 60);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  } else {
    // Urban Timelapse / Geometric motion
    ctx.fillStyle = '#11131a';
    ctx.fillRect(0, 0, w, h);

    // Dynamic rotating rings
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rot = progress * Math.PI * 2;

    for (let r = 80; r <= 320; r += 60) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * (r % 2 === 0 ? 1 : -0.7));
      ctx.strokeStyle = r % 120 === 0 ? '#00e5ff' : '#2979ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15, 60, 20]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // High tech reticle & crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - 380, cy);
    ctx.lineTo(cx + 380, cy);
    ctx.moveTo(cx, cy - 240);
    ctx.lineTo(cx, cy + 240);
    ctx.stroke();
  }

  // Cinematic metadata banner at top
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(20, 20, 320, 38);
  ctx.fillStyle = '#00e5ff';
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillText(`REC 4K PRORES 422 HQ • ${(progress * 6).toFixed(2)}s / 6.00s`, 32, 44);

  ctx.restore();
}

function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}
