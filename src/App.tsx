/**
 * SaadCut Studio — Professional Offline Video Editor
 * Main Application Component
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderToolbar } from './components/HeaderToolbar';
import { LeftPanel } from './components/LeftPanel';
import { PreviewMonitor } from './components/PreviewMonitor';
import { RightInspector } from './components/RightInspector';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import {
  TimelineClip,
  Track,
  MediaItem,
  ProjectSettings,
  AspectRatio,
} from './types/editor';
import { DEFAULT_COLOR_GRADING, CINEMATIC_COLOR_PRESETS } from './constants/colorPresets';
import { DEFAULT_TEXT_CLIP } from './constants/textAnimations';
import { generateDemoVideoClip } from './utils/demoMediaGenerator';
import { generateSoundEffect } from './utils/audioSynthesizer';

const DEFAULT_TRACKS: Track[] = [
  { id: 'track_text_1', name: 'Text 1', type: 'text', isMuted: false, isLocked: false, order: 0 },
  { id: 'track_video_2', name: 'Video 2 (Overlay)', type: 'video', isMuted: false, isLocked: false, order: 1 },
  { id: 'track_video_1', name: 'Video 1 (Main)', type: 'video', isMuted: false, isLocked: false, order: 2 },
  { id: 'track_audio_1', name: 'Audio 1 (Music)', type: 'audio', isMuted: false, isLocked: false, order: 3 },
  { id: 'track_audio_2', name: 'Audio 2 (SFX)', type: 'audio', isMuted: false, isLocked: false, order: 4 },
];

export default function App() {
  // Project settings
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    title: 'Cinematic Sequence 01',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 12.0,
    previewQuality: 'full',
  });

  // Editor State
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [mediaPool, setMediaPool] = useState<MediaItem[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Playback & Transport
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playheadIntervalRef = useRef<any>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<Array<{ clips: TimelineClip[]; tracks: Track[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoAction = useRef(false);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAutosaved, setIsAutosaved] = useState(true);

  // Hidden file input for drag & drop or header import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Record undo state whenever clips or tracks change
  const recordHistory = useCallback(
    (newClips: TimelineClip[], newTracks: Track[]) => {
      if (isUndoRedoAction.current) {
        isUndoRedoAction.current = false;
        return;
      }
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push({ clips: newClips, tracks: newTracks });
        if (next.length > 30) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
      setIsAutosaved(false);
    },
    [historyIndex]
  );

  // Update clips helper
  const updateClipsState = (newClips: TimelineClip[] | ((prev: TimelineClip[]) => TimelineClip[])) => {
    setClips((prev) => {
      const resolved = typeof newClips === 'function' ? newClips(prev) : newClips;
      recordHistory(resolved, tracks);
      return resolved;
    });
  };

  // 1. Initial demo setup on boot
  useEffect(() => {
    const initDemo = async () => {
      try {
        const demoVideo = await generateDemoVideoClip('cyberpunk');
        const sfxWhoosh = await generateSoundEffect('whoosh');

        const sfxItem: MediaItem = {
          id: `sfx_demo_${Date.now()}`,
          name: 'Cinematic_Whoosh_Impact.wav',
          type: 'audio',
          url: sfxWhoosh.url,
          duration: sfxWhoosh.duration,
          addedAt: Date.now(),
        };

        const initialMedia = [demoVideo, sfxItem];
        setMediaPool(initialMedia);

        // Prepopulate timeline with initial master sequence
        const initialClips: TimelineClip[] = [
          // Main Video
          {
            id: 'clip_v1',
            trackId: 'track_video_1',
            mediaId: demoVideo.id,
            name: demoVideo.name,
            type: 'video',
            startTime: 0,
            duration: 6.0,
            trimIn: 0,
            sourceDuration: demoVideo.duration,
            speed: 1.0,
            isReversed: false,
            opticalFlow: false,
            transform: {
              posX: 0,
              posY: 0,
              scale: 1.0,
              rotation: 0,
              opacity: 1.0,
              flipH: false,
              flipV: false,
              blendMode: 'normal',
            },
            colorGrading: {
              ...DEFAULT_COLOR_GRADING,
              ...CINEMATIC_COLOR_PRESETS[1].settings, // Teal & Orange by default
              preset: 'teal_orange',
              presetIntensity: 90,
            },
            audioSettings: {
              volume: 1.0,
              isMuted: false,
              fadeIn: 0.2,
              fadeOut: 0.5,
              normalize: true,
              pan: 0,
            },
            keyframes: [],
          },
          // Animated Title
          {
            id: 'clip_text_1',
            trackId: 'track_text_1',
            name: 'SaadCut Studio Pro',
            type: 'text',
            startTime: 0.5,
            duration: 5.0,
            trimIn: 0,
            sourceDuration: 5.0,
            speed: 1.0,
            isReversed: false,
            opticalFlow: false,
            transform: {
              posX: 0,
              posY: 0,
              scale: 1.0,
              rotation: 0,
              opacity: 1.0,
              flipH: false,
              flipV: false,
              blendMode: 'normal',
            },
            colorGrading: { ...DEFAULT_COLOR_GRADING },
            textData: {
              ...DEFAULT_TEXT_CLIP,
              text: 'SAADCUT STUDIO PRO',
              animation: 'typewriter',
              animationDuration: 1.8,
              fontSize: 64,
            },
            audioSettings: {
              volume: 1.0,
              isMuted: false,
              fadeIn: 0,
              fadeOut: 0,
              normalize: false,
              pan: 0,
            },
            keyframes: [],
          },
          // SFX Whoosh
          {
            id: 'clip_sfx_1',
            trackId: 'track_audio_2',
            mediaId: sfxItem.id,
            name: sfxItem.name,
            type: 'audio',
            startTime: 0.4,
            duration: sfxWhoosh.duration,
            trimIn: 0,
            sourceDuration: sfxWhoosh.duration,
            speed: 1.0,
            isReversed: false,
            opticalFlow: false,
            transform: {
              posX: 0,
              posY: 0,
              scale: 1.0,
              rotation: 0,
              opacity: 1.0,
              flipH: false,
              flipV: false,
              blendMode: 'normal',
            },
            colorGrading: { ...DEFAULT_COLOR_GRADING },
            audioSettings: {
              volume: 1.2,
              isMuted: false,
              fadeIn: 0.05,
              fadeOut: 0.2,
              normalize: true,
              pan: 0,
            },
            keyframes: [],
          },
        ];

        setClips(initialClips);
        setSelectedClipId('clip_v1');
        recordHistory(initialClips, DEFAULT_TRACKS);
      } catch (err) {
        console.error('Initial sequence generation failed:', err);
      }
    };

    initDemo();
  }, []);

  // Calculate total sequence duration
  const totalDuration = Math.max(
    projectSettings.duration,
    ...clips.map((c) => c.startTime + c.duration)
  );

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / projectSettings.fps;
      playheadIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1 / projectSettings.fps;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, interval);
    } else {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    }

    return () => {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, [isPlaying, projectSettings.fps, totalDuration]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedClipId) handleDeleteClip(selectedClipId);
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitClip();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedClipId) handleDuplicateClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [selectedClipId, clips, currentTime, historyIndex, history]);

  // Undo / Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex - 1];
      setClips(target.clips);
      setTracks(target.tracks);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex + 1];
      setClips(target.clips);
      setTracks(target.tracks);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Split Clip at Playhead (S key)
  const handleSplitClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    // Check if playhead intersects clip
    if (currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
      const splitOffset = currentTime - clip.startTime;
      const firstDuration = splitOffset;
      const secondDuration = clip.duration - splitOffset;
      const sourceOffset = splitOffset * (clip.speed || 1);

      const clipPartA: TimelineClip = {
        ...clip,
        duration: firstDuration,
      };

      const clipPartB: TimelineClip = {
        ...clip,
        id: `clip_${Date.now()}_split`,
        startTime: currentTime,
        duration: secondDuration,
        trimIn: clip.trimIn + sourceOffset,
      };

      updateClipsState((prev) =>
        prev.map((c) => (c.id === clip.id ? clipPartA : c)).concat(clipPartB)
      );

      setSelectedClipId(clipPartB.id);
    }
  };

  // Delete Clip
  const handleDeleteClip = (clipId: string) => {
    updateClipsState((prev) => prev.filter((c) => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  // Duplicate Clip
  const handleDuplicateClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const dup: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}_dup`,
      startTime: clip.startTime + clip.duration + 0.1,
    };

    updateClipsState((prev) => [...prev, dup]);
    setSelectedClipId(dup.id);
  };

  // Add imported media to timeline
  const handleAddClipToTimeline = (media: MediaItem) => {
    // Choose appropriate track
    let trackId = 'track_video_1';
    if (media.type === 'audio') {
      trackId = 'track_audio_1';
    }

    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      trackId,
      mediaId: media.id,
      name: media.name,
      type: media.type,
      startTime: currentTime,
      duration: Math.min(media.duration || 5.0, 10.0),
      trimIn: 0,
      sourceDuration: media.duration || 5.0,
      speed: 1.0,
      isReversed: false,
      opticalFlow: false,
      transform: {
        posX: 0,
        posY: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        flipH: false,
        flipV: false,
        blendMode: 'normal',
      },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audioSettings: {
        volume: 1.0,
        isMuted: false,
        fadeIn: 0,
        fadeOut: 0,
        normalize: false,
        pan: 0,
      },
      keyframes: [],
    };

    updateClipsState((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  // Add text clip to timeline
  const handleAddTextClipToTimeline = (
    animationType: string = 'fade_in',
    initialText: string = 'SaadCut Studio',
    isUrdu: boolean = false
  ) => {
    const newClip: TimelineClip = {
      id: `clip_text_${Date.now()}`,
      trackId: 'track_text_1',
      name: initialText,
      type: 'text',
      startTime: currentTime,
      duration: 4.0,
      trimIn: 0,
      sourceDuration: 4.0,
      speed: 1.0,
      isReversed: false,
      opticalFlow: false,
      transform: {
        posX: 0,
        posY: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        flipH: false,
        flipV: false,
        blendMode: 'normal',
      },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      textData: {
        ...DEFAULT_TEXT_CLIP,
        text: initialText,
        animation: animationType as any,
        isUrdu,
        fontFamily: isUrdu ? 'Cairo' : 'Inter',
        textAlign: isUrdu ? 'right' : 'center',
      },
      audioSettings: {
        volume: 1.0,
        isMuted: false,
        fadeIn: 0,
        fadeOut: 0,
        normalize: false,
        pan: 0,
      },
      keyframes: [],
    };

    updateClipsState((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  // Detach Audio from video clip
  const handleDetachAudio = (clip: TimelineClip) => {
    if (clip.type !== 'video' || !clip.mediaId) return;

    // 1. Mute audio on original video clip
    onUpdateClip(clip.id, {
      audioSettings: { ...clip.audioSettings, isMuted: true },
    });

    // 2. Create standalone audio clip on Audio 2 track
    const detachedAudioClip: TimelineClip = {
      id: `clip_detached_${Date.now()}`,
      trackId: 'track_audio_2',
      mediaId: clip.mediaId,
      name: `${clip.name} (Audio)`,
      type: 'audio',
      startTime: clip.startTime,
      duration: clip.duration,
      trimIn: clip.trimIn,
      sourceDuration: clip.sourceDuration,
      speed: clip.speed,
      isReversed: clip.isReversed,
      opticalFlow: false,
      transform: { ...clip.transform },
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      audioSettings: {
        volume: clip.audioSettings.volume,
        isMuted: false,
        fadeIn: clip.audioSettings.fadeIn,
        fadeOut: clip.audioSettings.fadeOut,
        normalize: clip.audioSettings.normalize,
        pan: 0,
      },
      keyframes: [],
    };

    updateClipsState((prev) => [...prev, detachedAudioClip]);
  };

  // Apply color preset to selected clip
  const handleApplyColorPreset = (presetId: string) => {
    if (!selectedClipId) return;
    const preset = CINEMATIC_COLOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onUpdateClip(selectedClipId, {
      colorGrading: {
        ...DEFAULT_COLOR_GRADING,
        ...preset.settings,
        preset: preset.id,
        presetIntensity: 100,
      },
    });
  };

  // Single clip updater
  const onUpdateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    updateClipsState((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );
  };

  // File import (from file picker or drop)
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: MediaItem[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isAudio = ['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(ext);
      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext);
      const type = isAudio ? 'audio' : isImage ? 'image' : 'video';

      const url = URL.createObjectURL(file);
      newItems.push({
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        type,
        url,
        duration: isImage ? 5.0 : 10.0, // Default duration if not yet loaded
        size: file.size,
        addedAt: Date.now(),
      });
    });

    setMediaPool((prev) => [...prev, ...newItems]);
  };

  // Save Project File (.saadcut)
  const handleSaveProject = () => {
    const projectData = {
      version: '1.0.0',
      projectSettings,
      tracks,
      clips,
      savedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectSettings.title.replace(/\s+/g, '_')}.saadcut`;
    a.click();
    setIsAutosaved(true);
  };

  // Load Project File (.saadcut)
  const handleLoadProject = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.projectSettings) setProjectSettings(data.projectSettings);
      if (data.tracks) setTracks(data.tracks);
      if (data.clips) {
        setClips(data.clips);
        recordHistory(data.clips, data.tracks || tracks);
      }
      setSelectedClipId(null);
      setCurrentTime(0);
    } catch (e) {
      alert('Failed to parse SaadCut project file.');
    }
  };

  // Reset to brand new project
  const handleNewProject = () => {
    if (confirm('Create a new project? Any unsaved edits will be discarded.')) {
      setClips([]);
      setSelectedClipId(null);
      setCurrentTime(0);
      setProjectSettings((p) => ({ ...p, title: 'Untitled Sequence' }));
      recordHistory([], tracks);
    }
  };

  // Selected clip helper
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div
      className="w-screen h-screen flex flex-col bg-[#0d0e12] text-neutral-200 overflow-hidden font-['Inter']"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFilesSelected(e.dataTransfer.files);
      }}
    >
      {/* Hidden file input for file picker */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* 1. Top Header Toolbar */}
      <HeaderToolbar
        projectSettings={projectSettings}
        onUpdateProjectSettings={(s) => setProjectSettings((prev) => ({ ...prev, ...s }))}
        onNewProject={handleNewProject}
        onImportMedia={() => fileInputRef.current?.click()}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        isAutosaved={isAutosaved}
      />

      {/* 2. Middle Workspace Area: Left Panel, Center Monitor, Right Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          mediaPool={mediaPool}
          onAddMedia={(items) => setMediaPool((p) => [...p, ...items])}
          onDeleteMedia={(id) => setMediaPool((p) => p.filter((m) => m.id !== id))}
          onAddClipToTimeline={handleAddClipToTimeline}
          onAddTextClipToTimeline={handleAddTextClipToTimeline}
          onApplyColorPreset={handleApplyColorPreset}
          selectedClip={selectedClip}
          onOpenFilePicker={() => fileInputRef.current?.click()}
        />

        {/* Center Preview Monitor */}
        <PreviewMonitor
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
          onSeek={(t) => setCurrentTime(t)}
          tracks={tracks}
          clips={clips}
          mediaPool={mediaPool}
          projectSettings={projectSettings}
        />

        {/* Right Inspector */}
        <RightInspector
          selectedClip={selectedClip}
          onUpdateClip={onUpdateClip}
          onDetachAudio={handleDetachAudio}
        />
      </div>

      {/* 3. Bottom Multi-Track Timeline */}
      <Timeline
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSeek={(t) => setCurrentTime(t)}
        tracks={tracks}
        clips={clips}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onUpdateClip={onUpdateClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onSplitClip={handleSplitClip}
        onAddTrack={(type) => {
          const newTrack: Track = {
            id: `track_${type}_${Date.now()}`,
            name: `${type.toUpperCase()} ${tracks.filter((t) => t.type === type).length + 1}`,
            type,
            isMuted: false,
            isLocked: false,
            order: tracks.length,
          };
          setTracks((prev) => [...prev, newTrack]);
        }}
        onDeleteTrack={(trackId) => setTracks((prev) => prev.filter((t) => t.id !== trackId))}
        onToggleMuteTrack={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t))
          )
        }
        onToggleLockTrack={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isLocked: !t.isLocked } : t))
          )
        }
        mediaPool={mediaPool}
        fps={projectSettings.fps}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        clips={clips}
        tracks={tracks}
        mediaPool={mediaPool}
        projectTitle={projectSettings.title}
      />

      {/* Settings & System Diagnostics Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        projectSettings={projectSettings}
        onUpdateProjectSettings={(s) => setProjectSettings((prev) => ({ ...prev, ...s }))}
      />
    </div>
  );
}
