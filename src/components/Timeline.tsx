import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Plus,
  ZoomIn,
  ZoomOut,
  Magnet,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Video,
  Music,
  Type,
  MousePointer,
} from 'lucide-react';
import { TimelineClip, Track, MediaItem } from '../types/editor';
import { formatTimecode } from '../utils/timecode';

interface TimelineProps {
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  tracks: Track[];
  clips: TimelineClip[];
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onSplitClip: () => void;
  onAddTrack: (type: 'video' | 'audio' | 'text') => void;
  onDeleteTrack: (trackId: string) => void;
  onToggleMuteTrack: (trackId: string) => void;
  onToggleLockTrack: (trackId: string) => void;
  mediaPool: MediaItem[];
  fps: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  totalDuration,
  onSeek,
  tracks,
  clips,
  selectedClipId,
  onSelectClip,
  onUpdateClip,
  onDeleteClip,
  onDuplicateClip,
  onSplitClip,
  onAddTrack,
  onToggleMuteTrack,
  onToggleLockTrack,
  mediaPool,
  fps,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoomPixelsPerSec, setZoomPixelsPerSec] = useState<number>(60); // 60px per second default
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [draggingPlayhead, setDraggingPlayhead] = useState<boolean>(false);

  // Dragging / Trimming Clip state
  const [dragState, setDragState] = useState<{
    clipId: string;
    type: 'move' | 'trim-left' | 'trim-right';
    startX: number;
    initialStartTime: number;
    initialDuration: number;
    initialTrimIn: number;
    trackId: string;
  } | null>(null);

  // Ruler scrub mouse handler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, x / zoomPixelsPerSec);
    onSeek(time);
    setDraggingPlayhead(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingPlayhead && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, x / zoomPixelsPerSec);
        onSeek(time);
      } else if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        const deltaTime = deltaX / zoomPixelsPerSec;

        if (dragState.type === 'move') {
          let newStartTime = Math.max(0, dragState.initialStartTime + deltaTime);

          // Snapping logic
          if (snapEnabled) {
            // Snap to playhead
            if (Math.abs(newStartTime - currentTime) < 0.25) {
              newStartTime = currentTime;
            }
            // Snap to other clips
            for (const c of clips) {
              if (c.id === dragState.clipId) continue;
              if (Math.abs(newStartTime - (c.startTime + c.duration)) < 0.25) {
                newStartTime = c.startTime + c.duration;
              }
            }
          }

          onUpdateClip(dragState.clipId, { startTime: newStartTime });
        } else if (dragState.type === 'trim-left') {
          const maxLeftTrim = dragState.initialDuration - 0.2;
          const clampedDelta = Math.min(maxLeftTrim, Math.max(-dragState.initialStartTime, deltaTime));
          const newStart = dragState.initialStartTime + clampedDelta;
          const newDur = dragState.initialDuration - clampedDelta;
          const newTrimIn = Math.max(0, dragState.initialTrimIn + clampedDelta);

          onUpdateClip(dragState.clipId, {
            startTime: newStart,
            duration: newDur,
            trimIn: newTrimIn,
          });
        } else if (dragState.type === 'trim-right') {
          const newDur = Math.max(0.2, dragState.initialDuration + deltaTime);
          onUpdateClip(dragState.clipId, { duration: newDur });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingPlayhead(false);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPlayhead, dragState, zoomPixelsPerSec, onSeek, onUpdateClip, snapEnabled, currentTime, clips]);

  // Timeline ruler calibration marks
  const renderRulerTicks = () => {
    const totalSecs = Math.max(60, Math.ceil(totalDuration) + 10);
    const ticks = [];
    const step = zoomPixelsPerSec >= 100 ? 1 : zoomPixelsPerSec >= 40 ? 2 : 5;

    for (let sec = 0; sec <= totalSecs; sec += step) {
      const left = sec * zoomPixelsPerSec;
      ticks.push(
        <div key={sec} className="absolute top-0 bottom-0 flex flex-col justify-end" style={{ left }}>
          <span className="font-['JetBrains_Mono'] text-[9px] text-neutral-500 pl-1 select-none pointer-events-none">
            {formatTimecode(sec, fps)}
          </span>
          <div className="w-[1px] h-2 bg-[#2d3345]" />
        </div>
      );
    }
    return ticks;
  };

  const playheadLeft = currentTime * zoomPixelsPerSec;

  return (
    <div className="h-64 bg-[#0d0e14] border-t border-[#1e2330] flex flex-col shrink-0 select-none z-20 overflow-hidden">
      {/* 1. Timeline Controls Toolbar */}
      <div className="h-9 bg-[#11131b] border-b border-[#1c212e] px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Split / Razor tool (S) */}
          <button
            onClick={onSplitClip}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181d29] hover:bg-[#22293b] text-neutral-200 hover:text-cyan-400 disabled:opacity-30 disabled:hover:bg-[#181d29] transition border border-[#23293a]"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-[11px]">Split (S)</span>
          </button>

          {/* Delete (Del) */}
          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1.5 rounded bg-[#181d29] hover:bg-rose-900/40 text-neutral-400 hover:text-rose-300 disabled:opacity-30 transition border border-[#23293a]"
            title="Delete Selected Clip (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate (Ctrl+D) */}
          <button
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1.5 rounded bg-[#181d29] hover:bg-[#22293b] text-neutral-400 hover:text-neutral-200 disabled:opacity-30 transition border border-[#23293a]"
            title="Duplicate Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#1e2330] mx-1" />

          {/* Snap toggle */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`p-1.5 rounded transition ${
              snapEnabled ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle Magnet Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Add Track Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddTrack('video')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181d29] hover:bg-[#22293b] text-neutral-300 hover:text-cyan-400 text-[10px] font-medium border border-[#23293a]"
              title="Add Video Track"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
              <span>Video</span>
            </button>
            <button
              onClick={() => onAddTrack('audio')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181d29] hover:bg-[#22293b] text-neutral-300 hover:text-emerald-400 text-[10px] font-medium border border-[#23293a]"
              title="Add Audio Track"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Audio</span>
            </button>
            <button
              onClick={() => onAddTrack('text')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181d29] hover:bg-[#22293b] text-neutral-300 hover:text-amber-400 text-[10px] font-medium border border-[#23293a]"
              title="Add Text Track"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>Text</span>
            </button>
          </div>
        </div>

        {/* Right: Zoom Slider */}
        <div className="flex items-center gap-2">
          <ZoomOut className="w-3.5 h-3.5 text-neutral-500" />
          <input
            type="range"
            min="20"
            max="180"
            value={zoomPixelsPerSec}
            onChange={(e) => setZoomPixelsPerSec(parseInt(e.target.value, 10))}
            className="w-24 accent-cyan-400 h-1 bg-[#202534] rounded"
          />
          <ZoomIn className="w-3.5 h-3.5 text-neutral-500" />
          <span className="font-mono text-[10px] text-neutral-400 w-8 text-right">{zoomPixelsPerSec}px/s</span>
        </div>
      </div>

      {/* 2. Timeline Body: Headers on Left, Scrollable Tracks Canvas on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Column (Fixed on Left) */}
        <div className="w-48 bg-[#0f1118] border-r border-[#1e2330] flex flex-col shrink-0 select-none z-10">
          {/* Header spacer aligned with ruler */}
          <div className="h-7 border-b border-[#1e2330] bg-[#12141c] flex items-center px-3">
            <span className="text-[10px] font-semibold text-neutral-400 font-mono uppercase tracking-wider">TRACKS</span>
          </div>

          {/* Track Header Items */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-12 border-b border-[#1a1f2b] px-2 flex items-center justify-between text-xs bg-[#10121b]"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {track.type === 'video' ? (
                    <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : track.type === 'audio' ? (
                    <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium text-[11px] text-neutral-200 truncate">{track.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleMuteTrack(track.id)}
                    className={`p-1 rounded transition ${
                      track.isMuted ? 'text-rose-400 bg-rose-950/40' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.isMuted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => onToggleLockTrack(track.id)}
                    className={`p-1 rounded transition ${
                      track.isLocked ? 'text-amber-400 bg-amber-950/40' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {track.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Tracks Canvas with Time Ruler & Clips */}
        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col relative bg-[#090a0f]">
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-7 bg-[#12151e] border-b border-[#1e2330] relative shrink-0 cursor-pointer overflow-hidden"
            style={{ width: `${Math.max(1200, (totalDuration + 20) * zoomPixelsPerSec)}px` }}
          >
            {renderRulerTicks()}
          </div>

          {/* Tracks Area */}
          <div
            className="flex-1 relative"
            style={{ width: `${Math.max(1200, (totalDuration + 20) * zoomPixelsPerSec)}px` }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onSelectClip(null);
              }
            }}
          >
            {/* Playhead vertical red needle */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `${playheadLeft}px` }}
            >
              <div className="relative -ml-[6px]">
                {/* Scrubber head marker */}
                <div className="w-3 h-3 bg-red-500 rounded-xs shadow-md shadow-red-500/50" />
                {/* Needle line */}
                <div className="w-[1px] h-[500px] bg-red-500/90 ml-[5px]" />
              </div>
            </div>

            {/* Track Lanes */}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  className="h-12 border-b border-[#1a1f2b] relative bg-[#0e1017]/70"
                >
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const left = clip.startTime * zoomPixelsPerSec;
                    const width = Math.max(18, clip.duration * zoomPixelsPerSec);
                    const media = mediaPool.find((m) => m.id === clip.mediaId);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        className={`absolute top-1 bottom-1 rounded-md overflow-hidden flex items-center cursor-move transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30 z-20'
                            : 'hover:ring-1 hover:ring-cyan-500/40 z-10'
                        } ${
                          clip.type === 'video'
                            ? 'bg-gradient-to-r from-[#172c47] to-[#12233b] border border-cyan-800/60'
                            : clip.type === 'audio'
                            ? 'bg-gradient-to-r from-[#12382c] to-[#0d281f] border border-emerald-800/60'
                            : 'bg-gradient-to-r from-[#3d2f14] to-[#2b210c] border border-amber-800/60'
                        }`}
                        style={{ left: `${left}px`, width: `${width}px` }}
                        onMouseDown={(e) => {
                          // Prevent if clicking on trim handles
                          if ((e.target as HTMLElement).dataset.handle) return;
                          setDragState({
                            clipId: clip.id,
                            type: 'move',
                            startX: e.clientX,
                            initialStartTime: clip.startTime,
                            initialDuration: clip.duration,
                            initialTrimIn: clip.trimIn,
                            trackId: clip.trackId,
                          });
                        }}
                      >
                        {/* Left Trim Handle */}
                        <div
                          data-handle="left"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragState({
                              clipId: clip.id,
                              type: 'trim-left',
                              startX: e.clientX,
                              initialStartTime: clip.startTime,
                              initialDuration: clip.duration,
                              initialTrimIn: clip.trimIn,
                              trackId: clip.trackId,
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/10 hover:bg-cyan-400 cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition"
                        >
                          <div className="w-[1px] h-3 bg-white" />
                        </div>

                        {/* Clip Content Details */}
                        <div className="flex-1 px-3 flex items-center justify-between overflow-hidden pointer-events-none">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {clip.type === 'video' ? (
                              <Video className="w-3 h-3 text-cyan-400 shrink-0" />
                            ) : clip.type === 'audio' ? (
                              <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : (
                              <Type className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                            <span className="font-semibold text-[11px] text-neutral-100 truncate">
                              {clip.type === 'text' ? clip.textData?.text : clip.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-neutral-400">
                            {clip.speed !== 1.0 && (
                              <span className="px-1 py-0.2 rounded bg-black/40 text-cyan-400 font-bold">
                                {clip.speed}x
                              </span>
                            )}
                            <span className="text-neutral-400">{clip.duration.toFixed(1)}s</span>
                          </div>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          data-handle="right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDragState({
                              clipId: clip.id,
                              type: 'trim-right',
                              startX: e.clientX,
                              initialStartTime: clip.startTime,
                              initialDuration: clip.duration,
                              initialTrimIn: clip.trimIn,
                              trackId: clip.trackId,
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/10 hover:bg-cyan-400 cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition"
                        >
                          <div className="w-[1px] h-3 bg-white" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
