import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Maximize2,
  Minimize2,
  SplitSquareVertical,
  Crosshair,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TimelineClip, Track, MediaItem, ProjectSettings } from '../types/editor';
import { CanvasCompositor } from '../utils/canvasCompositor';
import { formatTimecode } from '../utils/timecode';

interface PreviewMonitorProps {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onSeek: (time: number) => void;
  tracks: Track[];
  clips: TimelineClip[];
  mediaPool: MediaItem[];
  projectSettings: ProjectSettings;
}

export const PreviewMonitor: React.FC<PreviewMonitorProps> = ({
  currentTime,
  totalDuration,
  isPlaying,
  onPlayPauseToggle,
  onSeek,
  tracks,
  clips,
  mediaPool,
  projectSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compositorRef = useRef<CanvasCompositor | null>(null);

  const [splitPreview, setSplitPreview] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'fit' | '50' | '75' | '100'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vuLevelLeft, setVuLevelLeft] = useState(0);
  const [vuLevelRight, setVuLevelRight] = useState(0);

  // Initialize Canvas Compositor
  useEffect(() => {
    if (canvasRef.current && !compositorRef.current) {
      compositorRef.current = new CanvasCompositor(canvasRef.current);
    }
  }, []);

  // Update canvas dimensions based on project settings
  useEffect(() => {
    if (compositorRef.current) {
      const w = projectSettings.width || 1920;
      const h = projectSettings.height || 1080;
      compositorRef.current.setSize(w, h);
    }
  }, [projectSettings.width, projectSettings.height]);

  // Sync seek and render frames
  useEffect(() => {
    if (compositorRef.current) {
      compositorRef.current.seekMediaElements(clips, mediaPool, currentTime);
      compositorRef.current.renderFrame({
        currentTime,
        tracks,
        clips,
        mediaPool,
        splitPreview,
        showGuides,
        aspectRatio: projectSettings.aspectRatio,
      });
    }

    // Simulate audio VU meter response if playing
    if (isPlaying) {
      const activeAudios = clips.filter(
        (c) => (c.type === 'video' || c.type === 'audio') && currentTime >= c.startTime && currentTime <= (c.startTime + c.duration) && !c.audioSettings.isMuted
      );
      if (activeAudios.length > 0) {
        setVuLevelLeft(Math.min(95, 30 + Math.random() * 55));
        setVuLevelRight(Math.min(95, 28 + Math.random() * 58));
      } else {
        setVuLevelLeft(0);
        setVuLevelRight(0);
      }
    } else {
      setVuLevelLeft(0);
      setVuLevelRight(0);
    }
  }, [currentTime, tracks, clips, mediaPool, splitPreview, showGuides, isPlaying, projectSettings.aspectRatio]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPauseToggle();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 1.0 : 1 / projectSettings.fps;
        onSeek(Math.max(0, currentTime - delta));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 1.0 : 1 / projectSettings.fps;
        onSeek(Math.min(totalDuration, currentTime + delta));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, totalDuration, onPlayPauseToggle, onSeek, projectSettings.fps]);

  // Step helpers
  const stepFrame = (frames: number) => {
    const delta = frames / projectSettings.fps;
    onSeek(Math.max(0, Math.min(totalDuration, currentTime + delta)));
  };

  const stepSeconds = (secs: number) => {
    onSeek(Math.max(0, Math.min(totalDuration, currentTime + secs)));
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col bg-[#0b0c10] select-none min-w-0 min-h-0 overflow-hidden relative ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Top Monitor Status Bar */}
      <div className="h-9 bg-[#11131b] border-b border-[#1c212e] px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            PROGRAM MONITOR
          </span>

          <span className="text-[10px] text-neutral-400 font-mono">
            {projectSettings.width}x{projectSettings.height} @ {projectSettings.fps}fps
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Before/After Split Preview Toggle */}
          <button
            onClick={() => setSplitPreview(!splitPreview)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              splitPreview
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181d29]'
            }`}
            title="Toggle Before/After Split Screen Comparison"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Compare</span>
          </button>

          {/* Title-Safe Action Guides Toggle */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
              showGuides
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181d29]'
            }`}
            title="Toggle 80%/90% Title-Safe Action Guides & Center Crosshair"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Guides</span>
          </button>

          {/* Zoom Level */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as any)}
            className="bg-[#181c26] text-neutral-300 text-[11px] px-1.5 py-0.5 rounded border border-[#23293a] focus:outline-none"
          >
            <option value="fit">Fit View</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </select>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#181d29]"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-[#07080b]">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-md overflow-hidden bg-black border border-[#1b202e]"
          style={{
            aspectRatio: projectSettings.aspectRatio === '9:16' ? '9/16' : projectSettings.aspectRatio === '1:1' ? '1/1' : projectSettings.aspectRatio === '21:9' ? '21/9' : '16/9',
            maxHeight: '100%',
            maxWidth: '100%',
            height: zoomLevel === '50' ? '50%' : zoomLevel === '75' ? '75%' : zoomLevel === '100' ? '100%' : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={projectSettings.width || 1920}
            height={projectSettings.height || 1080}
            className="w-full h-full object-contain block"
          />

          {/* Stereo VU Meters overlay on right edge */}
          <div className="absolute right-2 top-2 bottom-2 w-3.5 bg-black/60 backdrop-blur-xs rounded flex flex-col justify-end p-0.5 gap-0.5 pointer-events-none border border-white/5">
            <div className="flex-1 flex gap-0.5">
              <div className="w-1 bg-neutral-800 rounded-xs overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full transition-all duration-75 bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500"
                  style={{ height: `${vuLevelLeft}%` }}
                />
              </div>
              <div className="w-1 bg-neutral-800 rounded-xs overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full transition-all duration-75 bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500"
                  style={{ height: `${vuLevelRight}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="h-12 bg-[#10121a] border-t border-[#1c202e] px-4 flex items-center justify-between text-xs shrink-0">
        {/* Timecode Current / Total */}
        <div className="flex items-center gap-2">
          <span className="font-['JetBrains_Mono'] text-sm font-bold text-cyan-400 tracking-wider">
            {formatTimecode(currentTime, projectSettings.fps)}
          </span>
          <span className="text-neutral-600 font-mono text-xs">/</span>
          <span className="font-['JetBrains_Mono'] text-xs font-semibold text-neutral-400">
            {formatTimecode(totalDuration, projectSettings.fps)}
          </span>
        </div>

        {/* Center Playback Transport */}
        <div className="flex items-center gap-1">
          {/* Jump to start */}
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Step 1s back */}
          <button
            onClick={() => stepSeconds(-1)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition"
            title="Step Back 1 Second (Shift+Left)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Step 1 frame back */}
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition text-[10px] font-mono"
            title="Step Back 1 Frame (Left Arrow)"
          >
            -1F
          </button>

          {/* Master Play / Pause Button */}
          <button
            onClick={onPlayPauseToggle}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-500/25 transition active:scale-90 mx-1 cursor-pointer"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Step 1 frame forward */}
          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition text-[10px] font-mono"
            title="Step Forward 1 Frame (Right Arrow)"
          >
            +1F
          </button>

          {/* Step 1s forward */}
          <button
            onClick={() => stepSeconds(1)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition"
            title="Step Forward 1 Second (Shift+Right)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to end */}
          <button
            onClick={() => onSeek(totalDuration)}
            className="p-1.5 rounded-md hover:bg-[#1c2230] text-neutral-400 hover:text-white transition"
            title="Jump to End (End)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-md transition ${
              isLooping ? 'text-cyan-400 bg-[#1b2233]' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Loop Playback"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right audio info */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
          <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>48kHz STEREO</span>
        </div>
      </div>
    </div>
  );
};
