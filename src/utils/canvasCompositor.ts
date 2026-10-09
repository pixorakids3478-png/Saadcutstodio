/**
 * Canvas Compositor Engine for SaadCut Studio
 * Handles multi-track video compositing, color grading filters, text animations,
 * transform matrices, split-screen preview, and letterboxing.
 */
import { TimelineClip, Track, MediaItem, ColorGradingSettings, TextClipData } from '../types/editor';

export class CanvasCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaElements: Map<string, HTMLVideoElement | HTMLImageElement> = new Map();
  private audioContext: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setSize(width: number, height: number) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public getOrCreateMediaElement(media: MediaItem): HTMLVideoElement | HTMLImageElement {
    let el = this.mediaElements.get(media.id);
    if (el) return el;

    if (media.type === 'video') {
      const video = document.createElement('video');
      video.src = media.url;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.muted = true; // Muted in DOM, audio routed via Web Audio if needed
      video.preload = 'auto';
      this.mediaElements.set(media.id, video);
      return video;
    } else {
      const img = new Image();
      img.src = media.url;
      img.crossOrigin = 'anonymous';
      this.mediaElements.set(media.id, img);
      return img;
    }
  }

  public seekMediaElements(clips: TimelineClip[], mediaPool: MediaItem[], currentTime: number) {
    for (const clip of clips) {
      if (clip.type !== 'video' || !clip.mediaId) continue;
      const media = mediaPool.find((m) => m.id === clip.mediaId);
      if (!media) continue;

      const el = this.getOrCreateMediaElement(media);
      if (el instanceof HTMLVideoElement) {
        // Calculate source media time based on timeline time, trim, speed & reverse
        const clipElapsed = currentTime - clip.startTime;
        if (clipElapsed >= 0 && clipElapsed <= clip.duration) {
          let sourceTime = clip.trimIn + (clipElapsed * (clip.speed || 1));
          if (clip.isReversed) {
            sourceTime = (clip.trimIn + clip.duration * (clip.speed || 1)) - (clipElapsed * (clip.speed || 1));
          }
          sourceTime = Math.max(0, Math.min(media.duration || 1000, sourceTime));
          
          if (Math.abs(el.currentTime - sourceTime) > 0.08) {
            el.currentTime = sourceTime;
          }
        }
      }
    }
  }

  public renderFrame(options: {
    currentTime: number;
    tracks: Track[];
    clips: TimelineClip[];
    mediaPool: MediaItem[];
    splitPreview?: boolean;
    showGuides?: boolean;
    aspectRatio?: string;
  }) {
    const { currentTime, tracks, clips, mediaPool, splitPreview = false, showGuides = false } = options;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Clear background to dark studio charcoal
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, w, h);

    // Filter tracks: sort by order, ignore muted tracks
    const sortedTracks = [...tracks].sort((a, b) => a.order - b.order);

    for (const track of sortedTracks) {
      if (track.isMuted) continue;

      // Find clips active at this timestamp on this track
      const activeClips = clips.filter(
        (c) => c.trackId === track.id && currentTime >= c.startTime && currentTime <= (c.startTime + c.duration)
      );

      for (const clip of activeClips) {
        if (clip.type === 'video' || clip.type === 'image') {
          this.renderVisualClip(ctx, clip, mediaPool, currentTime, w, h, splitPreview);
        } else if (clip.type === 'text' && clip.textData) {
          this.renderTextClip(ctx, clip, currentTime, w, h);
        }
      }
    }

    // 2. Global cinematic letterbox if enabled on any active clip
    const hasLetterbox = clips.some(
      (c) => currentTime >= c.startTime && currentTime <= (c.startTime + c.duration) && c.colorGrading.cinematicLetterbox
    );
    if (hasLetterbox) {
      this.drawLetterbox(ctx, w, h);
    }

    // 3. Before/After Split Line indicator if in splitPreview mode
    if (splitPreview) {
      this.drawSplitIndicator(ctx, w, h);
    }

    // 4. Title-Safe Action Guides (90% & 80% boxes)
    if (showGuides) {
      this.drawTitleSafeGuides(ctx, w, h);
    }
  }

  private renderVisualClip(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    mediaPool: MediaItem[],
    currentTime: number,
    w: number,
    h: number,
    splitPreview: boolean
  ) {
    if (!clip.mediaId) return;
    const media = mediaPool.find((m) => m.id === clip.mediaId);
    if (!media) return;

    const el = this.getOrCreateMediaElement(media);
    const isVideo = el instanceof HTMLVideoElement;
    if (isVideo && el.readyState < 2 && el.currentTime === 0) {
      // Element not yet ready, ignore frame
      return;
    }

    ctx.save();

    // 1. Apply Transform (Position, Scale, Rotation, Opacity, Flips)
    const { posX = 0, posY = 0, scale = 1.0, rotation = 0, opacity = 1.0, flipH = false, flipV = false } = clip.transform;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    const cx = w * 0.5 + posX;
    const cy = h * 0.5 + posY;
    ctx.translate(cx, cy);

    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    const scaleX = (flipH ? -1 : 1) * scale;
    const scaleY = (flipV ? -1 : 1) * scale;
    ctx.scale(scaleX, scaleY);

    // Calculate source aspect ratio fit
    const srcW = (isVideo ? el.videoWidth : (el as HTMLImageElement).naturalWidth) || w;
    const srcH = (isVideo ? el.videoHeight : (el as HTMLImageElement).naturalHeight) || h;
    const scaleRatio = Math.min(w / srcW, h / srcH);
    const destW = srcW * scaleRatio;
    const destH = srcH * scaleRatio;

    // Apply color grading CSS filter string
    const grading = clip.colorGrading;
    const filterString = this.buildCssFilterString(grading, splitPreview ? 0.5 : 1.0);

    if (splitPreview) {
      // Draw left half without filters, right half with filters
      // Raw half
      ctx.save();
      ctx.beginPath();
      ctx.rect(-destW / 2, -destH / 2, destW / 2, destH);
      ctx.clip();
      ctx.drawImage(el, -destW / 2, -destH / 2, destW, destH);
      ctx.restore();

      // Graded half
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -destH / 2, destW / 2, destH);
      ctx.clip();
      ctx.filter = filterString;
      ctx.drawImage(el, -destW / 2, -destH / 2, destW, destH);
      ctx.restore();
    } else {
      ctx.filter = filterString;
      ctx.drawImage(el, -destW / 2, -destH / 2, destW, destH);
    }

    ctx.restore();

    // 2. Overlay Vignette if configured
    if (grading.vignette > 0 && !splitPreview) {
      this.drawVignette(ctx, w, h, grading.vignette);
    }

    // 3. Overlay Film Grain if configured
    if (grading.filmGrain > 0 && !splitPreview) {
      this.drawFilmGrain(ctx, w, h, grading.filmGrain);
    }
  }

  private buildCssFilterString(grading: ColorGradingSettings, intensityFactor: number = 1.0): string {
    const intensity = (grading.presetIntensity / 100) * intensityFactor;
    
    // Base parameters scaled by intensity
    const brightnessVal = 100 + (grading.brightness + grading.exposure * 0.8) * intensity;
    const contrastVal = 100 + grading.contrast * intensity;
    const saturationVal = 100 + grading.saturation * intensity;
    const hueVal = grading.hue * intensity;
    const sepiaVal = Math.max(0, grading.temperature * 0.4 * intensity);

    const parts = [
      `brightness(${Math.max(10, brightnessVal)}%)`,
      `contrast(${Math.max(10, contrastVal)}%)`,
      `saturate(${Math.max(0, saturationVal)}%)`,
    ];

    if (hueVal !== 0) {
      parts.push(`hue-rotate(${hueVal}deg)`);
    }

    if (sepiaVal > 0) {
      parts.push(`sepia(${sepiaVal}%)`);
    }

    return parts.join(' ');
  }

  private renderTextClip(ctx: CanvasRenderingContext2D, clip: TimelineClip, currentTime: number, w: number, h: number) {
    const textData = clip.textData;
    if (!textData) return;

    const clipElapsed = currentTime - clip.startTime;
    const duration = clip.duration;
    const animDuration = Math.min(clip.duration, textData.animationDuration || 0.8);
    const animProgress = Math.max(0, Math.min(1, clipElapsed / animDuration));

    let displayText = textData.text;
    let opacity = 1.0;
    let scale = 1.0;
    let offsetX = 0;
    let offsetY = 0;
    let letterSpacing = textData.letterSpacing || 0;

    // Apply animation calculation
    switch (textData.animation) {
      case 'typewriter': {
        const charCount = Math.floor(animProgress * textData.text.length);
        displayText = textData.text.substring(0, charCount);
        if (clipElapsed < animDuration && Math.floor(clipElapsed * 4) % 2 === 0) {
          displayText += '▎';
        }
        break;
      }
      case 'fade_in': {
        opacity = animProgress;
        break;
      }
      case 'fade_out': {
        const exitElapsed = Math.max(0, duration - clipElapsed);
        if (exitElapsed < animDuration) {
          opacity = exitElapsed / animDuration;
        }
        break;
      }
      case 'slide_left': {
        offsetX = -(1 - animProgress) * (w * 0.5);
        opacity = animProgress;
        break;
      }
      case 'slide_right': {
        offsetX = (1 - animProgress) * (w * 0.5);
        opacity = animProgress;
        break;
      }
      case 'slide_up': {
        offsetY = (1 - animProgress) * (h * 0.3);
        opacity = animProgress;
        break;
      }
      case 'slide_down': {
        offsetY = -(1 - animProgress) * (h * 0.3);
        opacity = animProgress;
        break;
      }
      case 'pop_in': {
        const p = animProgress;
        // overshoot spring calculation
        const overshoot = p < 0.7 ? (p / 0.7) * 1.2 : 1.2 - ((p - 0.7) / 0.3) * 0.2;
        scale = Math.max(0.01, overshoot);
        opacity = Math.min(1, p * 2);
        break;
      }
      case 'zoom_in': {
        scale = animProgress;
        opacity = animProgress;
        break;
      }
      case 'zoom_out': {
        scale = 1.8 - animProgress * 0.8;
        opacity = animProgress;
        break;
      }
      case 'bounce': {
        const b = animProgress;
        offsetY = Math.sin(b * Math.PI * 3) * (1 - b) * 40;
        opacity = Math.min(1, b * 3);
        break;
      }
      case 'tracking_reveal': {
        letterSpacing = (textData.letterSpacing || 2) + (1 - animProgress) * 16;
        opacity = animProgress;
        break;
      }
      case 'cinematic_title': {
        scale = 0.95 + animProgress * 0.1;
        letterSpacing = (textData.letterSpacing || 4) + animProgress * 6;
        opacity = Math.min(1, animProgress * 1.5);
        break;
      }
      case 'lower_third': {
        offsetX = -(1 - animProgress) * 200;
        offsetY = h * 0.32; // Lower third position
        opacity = animProgress;
        break;
      }
      case 'end_credits': {
        // Continuous scroll from bottom to top
        const scrollProgress = clipElapsed / duration;
        offsetY = (1 - scrollProgress * 2) * (h * 0.5);
        break;
      }
    }

    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Apply clip level transforms
    const posX = clip.transform.posX + offsetX;
    const posY = clip.transform.posY + offsetY;
    const cx = w * 0.5 + posX;
    const cy = h * 0.5 + posY;

    ctx.translate(cx, cy);
    if (clip.transform.rotation !== 0) {
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
    }
    ctx.scale(scale * clip.transform.scale, scale * clip.transform.scale);

    // Font setup
    const fontSize = textData.fontSize || 48;
    const fontFamily = textData.fontFamily || 'Inter';
    ctx.font = `${textData.fontWeight || '700'} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = textData.textAlign || 'center';
    ctx.textBaseline = 'middle';

    // Letter spacing calculation if supported
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = `${letterSpacing}px`;
    }

    // Measure text for background box
    const metrics = ctx.measureText(displayText);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    // Draw background box if set
    if (textData.backgroundColor && textData.backgroundColor !== 'transparent') {
      const pad = textData.backgroundPadding || 12;
      const rx = textData.textAlign === 'left' ? -pad : textData.textAlign === 'right' ? -textWidth - pad : -textWidth / 2 - pad;
      const ry = -textHeight / 2 - pad;
      const rw = textWidth + pad * 2;
      const rh = textHeight + pad * 2;
      const rad = textData.borderRadius || 6;

      ctx.fillStyle = textData.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, rad);
      ctx.fill();
    }

    // Shadow setup
    if (textData.shadowBlur > 0) {
      ctx.shadowColor = textData.shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = textData.shadowBlur;
      ctx.shadowOffsetX = textData.shadowOffsetX;
      ctx.shadowOffsetY = textData.shadowOffsetY;
    }

    // Outline setup
    if (textData.outlineWidth > 0) {
      ctx.strokeStyle = textData.outlineColor || '#000000';
      ctx.lineWidth = textData.outlineWidth;
      ctx.strokeText(displayText, 0, 0);
    }

    // Text fill
    ctx.fillStyle = textData.color || '#ffffff';
    ctx.fillText(displayText, 0, 0);

    ctx.restore();
  }

  private drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
    ctx.save();
    const radius = Math.max(w, h) * 0.75;
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, radius * 0.35, w * 0.5, h * 0.5, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${(amount / 100) * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${(intensity / 100) * 0.08})`;
    // Fast procedural grain dots
    const grainCount = (w * h) / 1200;
    for (let i = 0; i < grainCount; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
    ctx.restore();
  }

  private drawLetterbox(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 2.39:1 Cinemascope bar calculation
    const targetHeight = w / 2.39;
    const barHeight = Math.max(0, (h - targetHeight) / 2);
    if (barHeight > 0) {
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, barHeight);
      ctx.fillRect(0, h - barHeight, w, barHeight);
      ctx.restore();
    }
  }

  private drawSplitIndicator(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const splitX = w * 0.5;

    // Center dividing line
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();

    // Labels
    ctx.setLineDash([]);
    ctx.font = '600 12px "JetBrains Mono", sans-serif';
    
    // Left Label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(splitX - 100, 20, 90, 26);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('RAW / BEFORE', splitX - 55, 37);

    // Right Label
    ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.fillRect(splitX + 10, 20, 100, 26);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('GRADED / AFTER', splitX + 60, 37);

    ctx.restore();
  }

  private drawTitleSafeGuides(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Action Safe (90%)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    const ax = w * 0.05;
    const ay = h * 0.05;
    const aw = w * 0.9;
    const ah = h * 0.9;
    ctx.strokeRect(ax, ay, aw, ah);

    // Title Safe (80%)
    ctx.strokeStyle = 'rgba(255, 171, 0, 0.4)';
    const tx = w * 0.1;
    const ty = h * 0.1;
    const tw = w * 0.8;
    const th = h * 0.8;
    ctx.strokeRect(tx, ty, tw, th);

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 15, h * 0.5);
    ctx.lineTo(w * 0.5 + 15, h * 0.5);
    ctx.moveTo(w * 0.5, h * 0.5 - 15);
    ctx.lineTo(w * 0.5, h * 0.5 + 15);
    ctx.stroke();

    ctx.restore();
  }
}
