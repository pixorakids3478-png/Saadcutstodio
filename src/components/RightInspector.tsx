import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Volume2,
  Type,
  Gauge,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Activity,
  Layers,
  Check,
  Info,
  Maximize,
  Eye,
  Zap,
} from 'lucide-react';
import { TimelineClip, Track, MediaItem } from '../types/editor';
import { CINEMATIC_COLOR_PRESETS, DEFAULT_COLOR_GRADING } from '../constants/colorPresets';
import { TEXT_ANIMATIONS } from '../constants/textAnimations';

interface RightInspectorProps {
  selectedClip: TimelineClip | null;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onDetachAudio: (clip: TimelineClip) => void;
}

type InspectorTab = 'transform' | 'speed' | 'color' | 'audio' | 'text' | 'enhance';

export const RightInspector: React.FC<RightInspectorProps> = ({
  selectedClip,
  onUpdateClip,
  onDetachAudio,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('color');

  if (!selectedClip) {
    return (
      <aside className="w-80 bg-[#12141c] border-l border-[#1e2330] flex flex-col shrink-0 select-none z-20 p-6 text-center justify-center text-neutral-500">
        <Layers className="w-12 h-12 text-neutral-700 mx-auto mb-3 stroke-[1.5]" />
        <h4 className="font-semibold text-neutral-300 text-sm">No Clip Selected</h4>
        <p className="text-xs text-neutral-400 mt-1 max-w-[200px] mx-auto">
          Click any video, audio, or text clip on the timeline to inspect and tune its properties.
        </p>
      </aside>
    );
  }

  const isText = selectedClip.type === 'text';
  const hasAudio = selectedClip.type === 'video' || selectedClip.type === 'audio';
  const hasVisual = selectedClip.type === 'video' || selectedClip.type === 'image';

  // Helper updater
  const updateTransform = (field: string, val: any) => {
    onUpdateClip(selectedClip.id, {
      transform: { ...selectedClip.transform, [field]: val },
    });
  };

  const updateColor = (field: string, val: any) => {
    onUpdateClip(selectedClip.id, {
      colorGrading: { ...selectedClip.colorGrading, [field]: val },
    });
  };

  const updateAudio = (field: string, val: any) => {
    onUpdateClip(selectedClip.id, {
      audioSettings: { ...selectedClip.audioSettings, [field]: val },
    });
  };

  const updateText = (field: string, val: any) => {
    if (!selectedClip.textData) return;
    onUpdateClip(selectedClip.id, {
      textData: { ...selectedClip.textData, [field]: val },
    });
  };

  return (
    <aside className="w-80 bg-[#12141c] border-l border-[#1e2330] flex flex-col shrink-0 select-none z-20 overflow-hidden">
      {/* Header with clip identity */}
      <div className="h-11 px-3 border-b border-[#1e2330] flex items-center justify-between bg-[#0d0e12]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-semibold text-xs text-neutral-200 truncate" title={selectedClip.name}>
            {selectedClip.name}
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c2233] text-cyan-400 border border-[#2b3550]">
          {selectedClip.duration.toFixed(2)}s
        </span>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-[#1e2330] bg-[#10121a] px-1">
        {hasVisual && (
          <button
            onClick={() => setActiveTab('color')}
            className={`flex-1 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'color'
                ? 'border-cyan-400 text-cyan-400 bg-[#171b26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Color</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1 border-b-2 ${
            activeTab === 'transform'
              ? 'border-cyan-400 text-cyan-400 bg-[#171b26]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Transform</span>
        </button>

        <button
          onClick={() => setActiveTab('speed')}
          className={`flex-1 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1 border-b-2 ${
            activeTab === 'speed'
              ? 'border-cyan-400 text-cyan-400 bg-[#171b26]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Speed</span>
        </button>

        {hasAudio && (
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-400 bg-[#171b26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        )}

        {isText && (
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'text'
                ? 'border-cyan-400 text-cyan-400 bg-[#171b26]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>
        )}
      </div>

      {/* Inspector Body Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
        {/* ================= 1. COLOR GRADING STUDIO ================= */}
        {activeTab === 'color' && hasVisual && (
          <div className="space-y-4">
            {/* Presets Grid Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-neutral-200 text-xs">Cinematic Filter Preset</span>
                <button
                  onClick={() =>
                    onUpdateClip(selectedClip.id, {
                      colorGrading: { ...DEFAULT_COLOR_GRADING },
                    })
                  }
                  className="text-[10px] text-neutral-400 hover:text-cyan-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <select
                value={selectedClip.colorGrading.preset}
                onChange={(e) => {
                  const preset = CINEMATIC_COLOR_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) {
                    onUpdateClip(selectedClip.id, {
                      colorGrading: {
                        ...selectedClip.colorGrading,
                        ...preset.settings,
                        preset: preset.id,
                        presetIntensity: 100,
                      },
                    });
                  } else {
                    updateColor('preset', 'none');
                  }
                }}
                className="w-full bg-[#171a26] border border-[#262c3e] text-neutral-200 rounded-md p-1.5 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="none">None (Rec.709 Natural)</option>
                {CINEMATIC_COLOR_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.category}
                  </option>
                ))}
              </select>

              {/* Intensity slider if preset active */}
              {selectedClip.colorGrading.preset !== 'none' && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Preset Intensity</span>
                    <span className="font-mono text-cyan-400">{selectedClip.colorGrading.presetIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip.colorGrading.presetIntensity}
                    onChange={(e) => updateColor('presetIntensity', parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                  />
                </div>
              )}
            </div>

            {/* Basic Exposure & Tone Controls */}
            <div className="space-y-3 pt-2 border-t border-[#1e2330]">
              <span className="font-semibold text-neutral-200 block text-xs">Primary Tone Adjustments</span>

              {/* Exposure */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Exposure</span>
                  <span className="font-mono">{selectedClip.colorGrading.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.exposure}
                  onChange={(e) => updateColor('exposure', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Contrast</span>
                  <span className="font-mono">{selectedClip.colorGrading.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.contrast}
                  onChange={(e) => updateColor('contrast', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Saturation</span>
                  <span className="font-mono">{selectedClip.colorGrading.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.saturation}
                  onChange={(e) => updateColor('saturation', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>

              {/* Temperature (Kelvin / Warm - Cool) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span>Temperature</span>
                    <span className="text-[9px] text-cyan-400/80">(Cool / Warm)</span>
                  </span>
                  <span className="font-mono">{selectedClip.colorGrading.temperature}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.temperature}
                  onChange={(e) => updateColor('temperature', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1 bg-gradient-to-r from-blue-700 via-neutral-700 to-amber-600 rounded"
                />
              </div>

              {/* Tint (Green - Magenta) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span>Tint</span>
                    <span className="text-[9px] text-cyan-400/80">(Green / Magenta)</span>
                  </span>
                  <span className="font-mono">{selectedClip.colorGrading.tint}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.tint}
                  onChange={(e) => updateColor('tint', parseInt(e.target.value, 10))}
                  className="w-full accent-fuchsia-400 h-1 bg-gradient-to-r from-emerald-700 via-neutral-700 to-fuchsia-600 rounded"
                />
              </div>
            </div>

            {/* Tonal Range: Highlights, Shadows */}
            <div className="space-y-3 pt-2 border-t border-[#1e2330]">
              <span className="font-semibold text-neutral-200 block text-xs">Tonal Range & Roll-off</span>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Highlights</span>
                  <span className="font-mono">{selectedClip.colorGrading.highlights}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.highlights}
                  onChange={(e) => updateColor('highlights', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Shadows</span>
                  <span className="font-mono">{selectedClip.colorGrading.shadows}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={selectedClip.colorGrading.shadows}
                  onChange={(e) => updateColor('shadows', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>
            </div>

            {/* Creative Stylistic Enhancements */}
            <div className="space-y-3 pt-2 border-t border-[#1e2330]">
              <span className="font-semibold text-neutral-200 block text-xs">Cinematic Optics & Artifacts</span>

              {/* 2.39:1 Letterbox toggle */}
              <label className="flex items-center justify-between p-2 rounded bg-[#171a26] border border-[#222838] cursor-pointer hover:border-cyan-500/40">
                <span className="text-neutral-300 font-medium text-xs">Cinematic 2.39:1 Letterbox Bars</span>
                <input
                  type="checkbox"
                  checked={selectedClip.colorGrading.cinematicLetterbox}
                  onChange={(e) => updateColor('cinematicLetterbox', e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>

              {/* Vignette */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Lens Vignette</span>
                  <span className="font-mono">{selectedClip.colorGrading.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.colorGrading.vignette}
                  onChange={(e) => updateColor('vignette', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>

              {/* Film Grain */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>35mm Film Grain Emulation</span>
                  <span className="font-mono">{selectedClip.colorGrading.filmGrain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedClip.colorGrading.filmGrain}
                  onChange={(e) => updateColor('filmGrain', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. TRANSFORM TAB ================= */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            <span className="font-semibold text-neutral-200 block text-xs">Position & Scale Geometry</span>

            {/* Position X & Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Position X (px)</span>
                <input
                  type="number"
                  value={selectedClip.transform.posX}
                  onChange={(e) => updateTransform('posX', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 font-mono text-xs text-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Position Y (px)</span>
                <input
                  type="number"
                  value={selectedClip.transform.posY}
                  onChange={(e) => updateTransform('posY', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 font-mono text-xs text-neutral-200"
                />
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Scale Zoom</span>
                <span className="font-mono">{Math.round(selectedClip.transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale}
                onChange={(e) => updateTransform('scale', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Rotation (degrees)</span>
                <span className="font-mono">{selectedClip.transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) => updateTransform('rotation', parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(selectedClip.transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.01"
                value={selectedClip.transform.opacity}
                onChange={(e) => updateTransform('opacity', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>

            {/* Flip Horizontal / Vertical */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#1e2330]">
              <button
                onClick={() => updateTransform('flipH', !selectedClip.transform.flipH)}
                className={`flex-1 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  selectedClip.transform.flipH
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-[#171a26] border-[#232838] text-neutral-400 hover:text-white'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Flip Horiz</span>
              </button>

              <button
                onClick={() => updateTransform('flipV', !selectedClip.transform.flipV)}
                className={`flex-1 py-1.5 rounded border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  selectedClip.transform.flipV
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-[#171a26] border-[#232838] text-neutral-400 hover:text-white'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>Flip Vert</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. SPEED & MOTION TAB ================= */}
        {activeTab === 'speed' && (
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-neutral-200 block text-xs">Speed Ramping & Duration</span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Current Playback Rate: <span className="text-cyan-400 font-mono font-bold">{selectedClip.speed}x</span>
              </p>
            </div>

            {/* Quick Speed Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              {[0.25, 0.5, 0.75, 1.0, 2.0, 4.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdateClip(selectedClip.id, { speed: rate })}
                  className={`py-1.5 rounded border font-mono text-xs font-semibold transition ${
                    selectedClip.speed === rate
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'bg-[#171a26] border-[#232838] text-neutral-300 hover:border-cyan-500/40'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Speed slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.05"
                value={selectedClip.speed}
                onChange={(e) => onUpdateClip(selectedClip.id, { speed: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>

            {/* Reverse Playback */}
            <label className="flex items-center justify-between p-2.5 rounded bg-[#171a26] border border-[#222838] cursor-pointer hover:border-cyan-500/40">
              <div>
                <span className="text-neutral-200 font-medium text-xs block">Reverse Playback</span>
                <span className="text-[10px] text-neutral-400">Renders frames backwards in time</span>
              </div>
              <input
                type="checkbox"
                checked={selectedClip.isReversed}
                onChange={(e) => onUpdateClip(selectedClip.id, { isReversed: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-400"
              />
            </label>

            {/* Optical-Flow Interpolation Mode */}
            <div className="p-2.5 rounded-lg bg-[#161a26] border border-[#232838] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-neutral-200 font-medium text-xs block">Optical-Flow Motion Interpolation</span>
                  <span className="text-[10px] text-cyan-400/80">Generates ultra-smooth 60fps in-between frames</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedClip.opticalFlow}
                  onChange={(e) => onUpdateClip(selectedClip.id, { opticalFlow: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>

              {selectedClip.opticalFlow && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-600/30 flex items-start gap-1.5 text-[10px] text-amber-300">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Notice: Optical-flow vector calculation significantly increases FFmpeg export encoding time.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 4. AUDIO TAB ================= */}
        {activeTab === 'audio' && hasAudio && (
          <div className="space-y-4">
            <span className="font-semibold text-neutral-200 block text-xs">Audio Levels & Mixing</span>

            {/* Volume slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Master Volume</span>
                <span className="font-mono">{Math.round(selectedClip.audioSettings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={selectedClip.audioSettings.volume}
                onChange={(e) => updateAudio('volume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>

            {/* Mute button */}
            <label className="flex items-center justify-between p-2 rounded bg-[#171a26] border border-[#222838] cursor-pointer hover:border-cyan-500/40">
              <span className="text-neutral-300 font-medium text-xs">Mute Audio Track</span>
              <input
                type="checkbox"
                checked={selectedClip.audioSettings.isMuted}
                onChange={(e) => updateAudio('isMuted', e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-400"
              />
            </label>

            {/* Fades */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Fade In (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={selectedClip.audioSettings.fadeIn}
                  onChange={(e) => updateAudio('fadeIn', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 font-mono text-xs text-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Fade Out (sec)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={selectedClip.audioSettings.fadeOut}
                  onChange={(e) => updateAudio('fadeOut', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 font-mono text-xs text-neutral-200"
                />
              </div>
            </div>

            {/* Audio Normalization */}
            <label className="flex items-center justify-between p-2 rounded bg-[#171a26] border border-[#222838] cursor-pointer hover:border-cyan-500/40">
              <div>
                <span className="text-neutral-300 font-medium text-xs block">Normalize Loudness (EBU R128)</span>
                <span className="text-[10px] text-neutral-400">Maintains broadcast -23 LUFS level</span>
              </div>
              <input
                type="checkbox"
                checked={selectedClip.audioSettings.normalize}
                onChange={(e) => updateAudio('normalize', e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-400"
              />
            </label>

            {/* Detach Audio if it is a video clip */}
            {selectedClip.type === 'video' && (
              <button
                onClick={() => onDetachAudio(selectedClip)}
                className="w-full py-2 px-3 rounded-lg bg-[#1e2538] hover:bg-[#253048] text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition"
              >
                Detach Audio to Separate Track
              </button>
            )}
          </div>
        )}

        {/* ================= 5. TEXT TAB ================= */}
        {activeTab === 'text' && isText && selectedClip.textData && (
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-neutral-200 block text-xs mb-1">Text Content</span>
              <textarea
                value={selectedClip.textData.text}
                onChange={(e) => updateText('text', e.target.value)}
                dir={selectedClip.textData.isUrdu ? 'rtl' : 'ltr'}
                rows={3}
                className="w-full bg-[#171a26] border border-[#262c3e] rounded-md p-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Urdu RTL Toggle */}
            <label className="flex items-center justify-between p-2 rounded bg-[#171a26] border border-[#222838] cursor-pointer hover:border-cyan-500/40">
              <div>
                <span className="text-neutral-200 font-medium text-xs block">Urdu / RTL Nastaliq Mode</span>
                <span className="text-[10px] text-neutral-400">Right-to-left alignment & Urdu Cairo font</span>
              </div>
              <input
                type="checkbox"
                checked={selectedClip.textData.isUrdu}
                onChange={(e) => {
                  const isU = e.target.checked;
                  updateText('isUrdu', isU);
                  if (isU) {
                    updateText('fontFamily', 'Cairo');
                    updateText('textAlign', 'right');
                  }
                }}
                className="w-4 h-4 rounded accent-cyan-400"
              />
            </label>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Font Family</span>
                <select
                  value={selectedClip.textData.fontFamily}
                  onChange={(e) => updateText('fontFamily', e.target.value)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 text-xs text-neutral-200"
                >
                  <option value="Inter">Inter (Clean Sans)</option>
                  <option value="Cairo">Cairo (Urdu / Arabic)</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="Impact">Impact (Bold Title)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Font Size (px)</span>
                <input
                  type="number"
                  value={selectedClip.textData.fontSize}
                  onChange={(e) => updateText('fontSize', parseInt(e.target.value, 10) || 48)}
                  className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 font-mono text-xs text-neutral-200"
                />
              </div>
            </div>

            {/* Text Color & Alignment */}
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Text Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedClip.textData.color}
                    onChange={(e) => updateText('color', e.target.value)}
                    className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-neutral-300">{selectedClip.textData.color}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-neutral-400">Alignment</span>
                <div className="flex bg-[#171a26] p-0.5 rounded border border-[#232838]">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateText('textAlign', align)}
                      className={`flex-1 py-1 text-[10px] font-medium capitalize rounded ${
                        selectedClip.textData?.textAlign === align ? 'bg-[#22293b] text-cyan-400' : 'text-neutral-400'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Animation Selector */}
            <div className="space-y-1 pt-2 border-t border-[#1e2330]">
              <span className="font-semibold text-neutral-200 block text-xs">Animation Effect</span>
              <select
                value={selectedClip.textData.animation}
                onChange={(e) => updateText('animation', e.target.value)}
                className="w-full bg-[#171a26] border border-[#232838] rounded p-1.5 text-xs text-neutral-200"
              >
                {TEXT_ANIMATIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Animation Duration */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Animation Speed (Duration)</span>
                <span className="font-mono">{selectedClip.textData.animationDuration}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={selectedClip.textData.animationDuration}
                onChange={(e) => updateText('animationDuration', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-[#1e2333] rounded"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
