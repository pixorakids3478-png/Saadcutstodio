export type MediaType = 'video' | 'audio' | 'image';
export type TrackType = 'video' | 'audio' | 'text';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '21:9' | '4:5';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string; // Blob URL or local file path
  localPath?: string; // For desktop Electron
  duration: number; // in seconds
  width?: number;
  height?: number;
  size?: number; // bytes
  thumbnail?: string;
  fps?: number;
  addedAt: number;
}

export interface TransformSettings {
  posX: number; // normalized or pixels (-100 to 100)
  posY: number;
  scale: number; // 0.1 to 3.0
  rotation: number; // -180 to 180 degrees
  opacity: number; // 0 to 1
  flipH: boolean;
  flipV: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'lighten';
}

export interface RGBBalance {
  r: number;
  g: number;
  b: number;
}

export interface ColorWheelVal {
  r: number;
  g: number;
  b: number;
  y: number; // luminance offset
}

export interface ColorGradingSettings {
  preset: string; // 'none' | 'filmic_cinema' | 'teal_orange' etc.
  presetIntensity: number; // 0 to 100
  exposure: number; // -100 to 100
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  temperature: number; // -100 (cool) to 100 (warm)
  tint: number; // -100 (green) to 100 (magenta)
  hue: number; // 0 to 360
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
  gamma: number; // -50 to 50
  lift: number; // -50 to 50
  gain: number; // -50 to 50
  rgbBalance: RGBBalance;
  colorWheels: {
    lift: ColorWheelVal;
    gamma: ColorWheelVal;
    gain: ColorWheelVal;
  };
  vignette: number; // 0 to 100
  vignetteFeather: number; // 0 to 100
  filmGrain: number; // 0 to 100
  cinematicLetterbox: boolean; // 2.39:1 Cinemascope black bars
  sharpen: number; // 0 to 100
  noiseReduction: number; // 0 to 100
}

export type TextAnimationType =
  | 'none'
  | 'typewriter'
  | 'fade_in'
  | 'fade_out'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'pop_in'
  | 'zoom_in'
  | 'zoom_out'
  | 'bounce'
  | 'tracking_reveal'
  | 'cinematic_title'
  | 'lower_third'
  | 'subtitle_style'
  | 'end_credits';

export interface TextClipData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: '300' | '400' | '600' | '700' | '800';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number; // pixels
  outlineWidth: number;
  outlineColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
  backgroundColor: string;
  backgroundPadding: number;
  borderRadius: number;
  animation: TextAnimationType;
  animationDuration: number; // seconds
  animationDelay: number;
  isUrdu: boolean;
  titleSafeGuide: boolean;
}

export interface AudioSettings {
  volume: number; // 0.0 to 2.0 (1.0 = 100%)
  isMuted: boolean;
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  normalize: boolean;
  pan: number; // -1 to 1
}

export interface Keyframe {
  timeOffset: number; // relative to clip start in seconds
  scale?: number;
  posX?: number;
  posY?: number;
  opacity?: number;
  rotation?: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  mediaId?: string; // Reference to media pool item
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  startTime: number; // Position on timeline in seconds
  duration: number; // Visible length on timeline in seconds
  trimIn: number; // Offset into source media in seconds
  sourceDuration: number; // Total length of media source
  speed: number; // 0.25 to 4.0
  isReversed: boolean;
  opticalFlow: boolean; // Motion-interpolated slow motion flag
  transform: TransformSettings;
  colorGrading: ColorGradingSettings;
  textData?: TextClipData;
  audioSettings: AudioSettings;
  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  isMuted: boolean;
  isLocked: boolean;
  order: number;
}

export interface ProjectSettings {
  title: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: 24 | 25 | 30 | 50 | 60;
  duration: number; // dynamic or fixed target
  previewQuality: 'full' | 'half' | 'quarter';
}

export interface ExportSettings {
  filename: string;
  resolution: '720p' | '1080p' | '4k';
  width: number;
  height: number;
  fps: 24 | 25 | 30 | 50 | 60;
  format: 'mp4' | 'webm' | 'mov';
  videoBitrate: string; // e.g. '15M'
  audioBitrate: string; // e.g. '320k'
  qualityPreset: 'ultra' | 'high' | 'medium' | 'fast';
  sharpen: number;
  denoise: number;
  colorRecovery: boolean;
  offlineAiSuperRes: boolean;
  renderEngine: 'ffmpeg_native' | 'in_browser';
}

export interface RenderProgress {
  jobId: string;
  status: 'idle' | 'rendering' | 'completed' | 'error' | 'cancelled';
  percent: number; // 0 to 100
  fps: number;
  currentFrame: number;
  totalFrames: number;
  currentTime: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  error?: string;
  downloadUrl?: string;
  outputPath?: string;
}

export interface ColorPresetDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailColor: string;
  settings: Partial<ColorGradingSettings>;
}
