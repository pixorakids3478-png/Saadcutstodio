/**
 * FFmpeg Filter Graph Builder for SaadCut Studio
 * Generates robust FFmpeg complex filter graphs from multi-track timeline data
 */
import { TimelineClip, Track, ExportSettings, ColorGradingSettings } from '../types/editor';

export interface FFmpegRenderSpec {
  inputs: Array<{ id: string; path: string; isAudioOnly?: boolean }>;
  filterComplex: string;
  videoMap: string;
  audioMap: string;
  outputArgs: string[];
}

export function buildFFmpegFilterGraph(
  clips: TimelineClip[],
  tracks: Track[],
  exportSettings: ExportSettings,
  mediaPathMap: Record<string, string> // mediaId -> local filepath on disk / server
): FFmpegRenderSpec {
  const inputs: Array<{ id: string; path: string; isAudioOnly?: boolean }> = [];
  const inputIndexMap: Record<string, number> = {};

  // Register unique media files as FFmpeg inputs
  for (const clip of clips) {
    if (clip.mediaId && mediaPathMap[clip.mediaId]) {
      if (!(clip.mediaId in inputIndexMap)) {
        inputIndexMap[clip.mediaId] = inputs.length;
        inputs.push({
          id: clip.mediaId,
          path: mediaPathMap[clip.mediaId],
          isAudioOnly: clip.type === 'audio',
        });
      }
    }
  }

  const outW = exportSettings.width || 1920;
  const outH = exportSettings.height || 1080;
  const fps = exportSettings.fps || 30;

  const filterChains: string[] = [];
  let videoOutputPad = '';
  let audioOutputPad = '';

  // 1. Base black canvas of the total duration
  const totalDuration = Math.max(1, ...clips.map((c) => c.startTime + c.duration));
  filterChains.push(
    `color=c=0x0b0c10:s=${outW}x${outH}:d=${totalDuration.toFixed(3)}:r=${fps}[base_v]`
  );
  let currentCompPad = 'base_v';

  // Sort visual clips chronologically
  const visualClips = clips
    .filter((c) => (c.type === 'video' || c.type === 'image' || c.type === 'text') && !tracks.find((t) => t.id === c.trackId)?.isMuted)
    .sort((a, b) => a.startTime - b.startTime);

  let compIndex = 0;

  for (const clip of visualClips) {
    if ((clip.type === 'video' || clip.type === 'image') && clip.mediaId && inputIndexMap[clip.mediaId] !== undefined) {
      const inIdx = inputIndexMap[clip.mediaId];
      const trimIn = clip.trimIn || 0;
      const trimEnd = trimIn + clip.duration * (clip.speed || 1);
      const speed = clip.speed || 1;

      const clipPad = `clip_${clip.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const processedPad = `proc_${compIndex}`;

      // Build video filters for this clip
      const vFilters: string[] = [];
      // Trim & setpts
      vFilters.push(`trim=start=${trimIn.toFixed(3)}:end=${trimEnd.toFixed(3)}`);
      vFilters.push(`setpts=(1/${speed.toFixed(3)})*(PTS-STARTPTS)`);

      // Scale to fit canvas while preserving aspect ratio
      vFilters.push(`scale=${outW}:${outH}:force_original_aspect_ratio=decrease`);

      // Color grading filters
      const colorFilter = buildColorFilters(clip.colorGrading);
      if (colorFilter) {
        vFilters.push(colorFilter);
      }

      // Sharpen & detail if enhancement configured
      if (exportSettings.sharpen > 0) {
        vFilters.push(`unsharp=5:5:${(exportSettings.sharpen / 100 * 1.5).toFixed(2)}`);
      }

      // Letterbox bars if enabled
      if (clip.colorGrading.cinematicLetterbox) {
        const barH = Math.round((outH - outW / 2.39) / 2);
        if (barH > 0) {
          vFilters.push(`drawbox=y=0:h=${barH}:t=fill:c=black`);
          vFilters.push(`drawbox=y=${outH - barH}:h=${barH}:t=fill:c=black`);
        }
      }

      // Vignette
      if (clip.colorGrading.vignette > 0) {
        vFilters.push(`vignette=PI/4`);
      }

      filterChains.push(`[${inIdx}:v]${vFilters.join(',')}[${processedPad}]`);

      // Overlay onto canvas at clip.startTime
      const nextCompPad = `comp_${compIndex}`;
      const posX = clip.transform.posX || 0;
      const posY = clip.transform.posY || 0;
      const overlayX = `(W-w)/2+${posX}`;
      const overlayY = `(H-h)/2+${posY}`;
      const startT = clip.startTime.toFixed(3);
      const endT = (clip.startTime + clip.duration).toFixed(3);

      filterChains.push(
        `[${currentCompPad}][${processedPad}]overlay=x='${overlayX}':y='${overlayY}':enable='between(t,${startT},${endT})'[${nextCompPad}]`
      );
      currentCompPad = nextCompPad;
      compIndex++;
    } else if (clip.type === 'text' && clip.textData) {
      // Text clip drawtext filter
      const t = clip.textData;
      const startT = clip.startTime.toFixed(3);
      const endT = (clip.startTime + clip.duration).toFixed(3);
      const textEscaped = escapeDrawText(t.text);
      const fontSize = Math.round((t.fontSize || 48) * (outH / 1080));
      const fontColor = t.color ? t.color.replace('#', '0x') : 'white';
      
      const nextCompPad = `text_${compIndex}`;
      let textX = `(w-text_w)/2+${clip.transform.posX || 0}`;
      let textY = `(h-text_h)/2+${clip.transform.posY || 0}`;

      if (t.textAlign === 'left') {
        textX = `100+${clip.transform.posX || 0}`;
      } else if (t.textAlign === 'right') {
        textX = `w-text_w-100+${clip.transform.posX || 0}`;
      }

      let drawTextExpr = `drawtext=text='${textEscaped}':fontsize=${fontSize}:fontcolor=${fontColor}:x='${textX}':y='${textY}':enable='between(t,${startT},${endT})'`;
      if (t.shadowBlur > 0) {
        drawTextExpr += `:shadowcolor=black@0.7:shadowx=${t.shadowOffsetX}:shadowy=${t.shadowOffsetY}`;
      }

      filterChains.push(`[${currentCompPad}]${drawTextExpr}[${nextCompPad}]`);
      currentCompPad = nextCompPad;
      compIndex++;
    }
  }

  videoOutputPad = currentCompPad;

  // Audio mix handling
  const audioClips = clips.filter(
    (c) => (c.type === 'audio' || c.type === 'video') && !c.audioSettings.isMuted && !tracks.find((t) => t.id === c.trackId)?.isMuted
  );

  const audioPads: string[] = [];
  let aIdx = 0;

  for (const clip of audioClips) {
    if (clip.mediaId && inputIndexMap[clip.mediaId] !== undefined) {
      const inIdx = inputIndexMap[clip.mediaId];
      const trimIn = clip.trimIn || 0;
      const trimEnd = trimIn + clip.duration * (clip.speed || 1);
      const vol = clip.audioSettings.volume ?? 1.0;
      const delayMs = Math.round(clip.startTime * 1000);
      const outPad = `a_proc_${aIdx}`;

      const aFilters: string[] = [
        `atrim=start=${trimIn.toFixed(3)}:end=${trimEnd.toFixed(3)}`,
        `asetpts=PTS-STARTPTS`,
        `volume=${vol.toFixed(2)}`,
        `adelay=${delayMs}|${delayMs}`,
      ];

      if (clip.audioSettings.fadeIn > 0) {
        aFilters.push(`afade=t=in:st=0:d=${clip.audioSettings.fadeIn.toFixed(2)}`);
      }
      if (clip.audioSettings.fadeOut > 0) {
        const fadeStart = Math.max(0, clip.duration - clip.audioSettings.fadeOut);
        aFilters.push(`afade=t=out:st=${fadeStart.toFixed(2)}:d=${clip.audioSettings.fadeOut.toFixed(2)}`);
      }

      filterChains.push(`[${inIdx}:a]${aFilters.join(',')}[${outPad}]`);
      audioPads.push(`[${outPad}]`);
      aIdx++;
    }
  }

  if (audioPads.length > 0) {
    if (audioPads.length === 1) {
      audioOutputPad = audioPads[0].replace(/[\[\]]/g, '');
    } else {
      filterChains.push(`${audioPads.join('')}amix=inputs=${audioPads.length}:duration=longest[a_mix]`);
      audioOutputPad = 'a_mix';
    }
  } else {
    // Generate silent audio track so MP4 has valid sync audio stream
    filterChains.push(`anullsrc=channel_layout=stereo:sample_rate=48000:d=${totalDuration.toFixed(3)}[a_silent]`);
    audioOutputPad = 'a_silent';
  }

  const outputArgs: string[] = [
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', `${fps}`,
    '-preset', exportSettings.qualityPreset === 'ultra' ? 'slow' : exportSettings.qualityPreset === 'fast' ? 'veryfast' : 'medium',
    '-crf', exportSettings.qualityPreset === 'ultra' ? '16' : exportSettings.qualityPreset === 'high' ? '18' : '22',
    '-c:a', 'aac',
    '-b:a', exportSettings.audioBitrate || '256k',
    '-ar', '48000',
    '-movflags', '+faststart',
    '-t', `${totalDuration.toFixed(3)}`,
    '-y',
  ];

  return {
    inputs,
    filterComplex: filterChains.join(';'),
    videoMap: `[${videoOutputPad}]`,
    audioMap: `[${audioOutputPad}]`,
    outputArgs,
  };
}

function buildColorFilters(grading: ColorGradingSettings): string {
  const intensity = grading.presetIntensity / 100;
  const parts: string[] = [];

  const b = ((grading.brightness + grading.exposure * 0.8) / 100) * 0.4 * intensity;
  const c = 1.0 + (grading.contrast / 100) * 0.8 * intensity;
  const s = Math.max(0, 1.0 + (grading.saturation / 100) * 1.0 * intensity);
  const g = 1.0 + (grading.gamma / 50) * 0.5 * intensity;

  parts.push(`eq=brightness=${b.toFixed(3)}:contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}:gamma=${g.toFixed(3)}`);

  // Color balance for RGB and color temperature
  const tempOffset = (grading.temperature / 100) * 0.25 * intensity;
  const tintOffset = (grading.tint / 100) * 0.2 * intensity;
  const rBal = (grading.rgbBalance.r / 100) * 0.3 * intensity + tempOffset;
  const gBal = (grading.rgbBalance.g / 100) * 0.3 * intensity + tintOffset;
  const bBal = (grading.rgbBalance.b / 100) * 0.3 * intensity - tempOffset;

  if (Math.abs(rBal) > 0.01 || Math.abs(gBal) > 0.01 || Math.abs(bBal) > 0.01) {
    parts.push(`colorbalance=rs=${rBal.toFixed(3)}:gs=${gBal.toFixed(3)}:bs=${bBal.toFixed(3)}:rm=${rBal.toFixed(3)}:gm=${gBal.toFixed(3)}:bm=${bBal.toFixed(3)}`);
  }

  return parts.join(',');
}

function escapeDrawText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}
