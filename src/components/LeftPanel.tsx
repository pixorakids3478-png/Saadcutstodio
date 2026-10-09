import React, { useState } from 'react';
import {
  FolderOpen,
  Volume2,
  Type,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Play,
  Trash2,
  Music,
  Video,
  Image as ImageIcon,
  Clock,
  Layers,
  Wand2,
} from 'lucide-react';
import { MediaItem, TimelineClip, Track } from '../types/editor';
import { CINEMATIC_COLOR_PRESETS } from '../constants/colorPresets';
import { TEXT_ANIMATIONS } from '../constants/textAnimations';
import { generateSoundEffect } from '../utils/audioSynthesizer';
import { generateDemoVideoClip } from '../utils/demoMediaGenerator';

interface LeftPanelProps {
  mediaPool: MediaItem[];
  onAddMedia: (items: MediaItem[]) => void;
  onDeleteMedia: (id: string) => void;
  onAddClipToTimeline: (media: MediaItem) => void;
  onAddTextClipToTimeline: (animationType?: string, initialText?: string, isUrdu?: boolean) => void;
  onApplyColorPreset: (presetId: string) => void;
  selectedClip: TimelineClip | null;
  onOpenFilePicker: () => void;
}

type TabType = 'media' | 'audio' | 'text' | 'filters' | 'transitions';

export const LeftPanel: React.FC<LeftPanelProps> = ({
  mediaPool,
  onAddMedia,
  onDeleteMedia,
  onAddClipToTimeline,
  onAddTextClipToTimeline,
  onApplyColorPreset,
  selectedClip,
  onOpenFilePicker,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [playingSfx, setPlayingSfx] = useState<string | null>(null);

  // Filter media items
  const filteredMedia = mediaPool.filter((m) => {
    if (mediaFilter === 'all') return true;
    return m.type === mediaFilter;
  });

  // Handle SFX preview & add
  const handlePlayAndAddSfx = async (type: 'whoosh' | 'boom' | 'glitch' | 'pop' | 'bell' | 'riser', addToTimeline: boolean) => {
    setPlayingSfx(type);
    try {
      const { blob, url, duration } = await generateSoundEffect(type);
      const audio = new Audio(url);
      audio.play();

      if (addToTimeline) {
        const item: MediaItem = {
          id: `sfx_${type}_${Date.now()}`,
          name: `SFX_${type.toUpperCase()}.wav`,
          type: 'audio',
          url,
          duration,
          size: blob.size,
          addedAt: Date.now(),
        };
        onAddMedia([item]);
        onAddClipToTimeline(item);
      }
    } catch (err) {
      console.error('SFX generation failed:', err);
    } finally {
      setTimeout(() => setPlayingSfx(null), 1000);
    }
  };

  // Generate demo cinematic stock video
  const handleGenerateDemo = async (theme: 'cyberpunk' | 'cinematic_sunset' | 'urban_motion') => {
    setIsGeneratingDemo(true);
    try {
      const demoClip = await generateDemoVideoClip(theme);
      onAddMedia([demoClip]);
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  return (
    <aside className="w-80 bg-[#12141c] border-r border-[#1e2330] flex flex-col shrink-0 select-none z-20 overflow-hidden">
      {/* Tab Navigation Icons */}
      <div className="h-12 border-b border-[#1e2330] flex items-center justify-around px-2 bg-[#0d0e12]">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'media'
              ? 'bg-[#1e2538] text-cyan-400 border border-cyan-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#161a24]'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'audio'
              ? 'bg-[#1e2538] text-cyan-400 border border-cyan-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#161a24]'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'text'
              ? 'bg-[#1e2538] text-cyan-400 border border-cyan-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#161a24]'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Text</span>
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'filters'
              ? 'bg-[#1e2538] text-cyan-400 border border-cyan-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#161a24]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Grading</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* ================= 1. MEDIA TAB ================= */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenFilePicker}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition shadow-md shadow-cyan-900/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Import Media</span>
              </button>

              <button
                onClick={() => handleGenerateDemo('cyberpunk')}
                disabled={isGeneratingDemo}
                className="px-2.5 py-2 rounded-lg bg-[#1a2030] hover:bg-[#222b40] text-cyan-300 border border-[#2b3650] font-medium transition flex items-center gap-1"
                title="Generate stock video locally"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Stock Demo</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#0d0e14] p-1 rounded-md border border-[#1d2230]">
              {(['all', 'video', 'audio', 'image'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMediaFilter(filter)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded capitalize transition ${
                    mediaFilter === filter
                      ? 'bg-[#1f2638] text-cyan-400'
                      : 'text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Media Items Grid */}
            {filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-[#262c3e] rounded-xl text-center">
                <FolderOpen className="w-10 h-10 text-neutral-600 mb-2 stroke-[1.5]" />
                <p className="text-neutral-300 font-medium">No media imported</p>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
                  Drag and drop local MP4, WebM, MP3, WAV or PNG files here, or generate demo footage.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleGenerateDemo('cinematic_sunset')}
                    className="text-[11px] text-cyan-400 hover:underline font-medium"
                  >
                    + Add Sunset Demo
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    onClick={() => handleGenerateDemo('urban_motion')}
                    className="text-[11px] text-cyan-400 hover:underline font-medium"
                  >
                    + Add Urban Demo
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className="group relative bg-[#171a26] border border-[#23293a] hover:border-cyan-500/50 rounded-lg overflow-hidden transition flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-[#0a0b10] flex items-center justify-center overflow-hidden">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                      ) : item.type === 'audio' ? (
                        <div className="flex flex-col items-center justify-center text-cyan-400/80">
                          <Music className="w-7 h-7" />
                          <span className="text-[9px] mt-1 font-mono text-neutral-400">AUDIO</span>
                        </div>
                      ) : (
                        <Video className="w-7 h-7 text-neutral-500" />
                      )}

                      {/* Duration badge */}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-neutral-200">
                        {item.duration.toFixed(1)}s
                      </span>

                      {/* Hover Overlay Button to Add */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onAddClipToTimeline(item)}
                          className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] flex items-center gap-1 shadow"
                          title="Add to timeline"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => onDeleteMedia(item.id)}
                          className="p-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white"
                          title="Remove media"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <p className="text-[11px] font-medium text-neutral-200 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                        <span className="uppercase">{item.type}</span>
                        <span>{item.width ? `${item.width}p` : 'WAV'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= 2. AUDIO & SFX TAB ================= */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cinematic Sound Effects</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Pristine synthesized SFX generated offline. Click play to preview or add to audio track.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                { type: 'whoosh', name: 'Cinematic Whoosh Transition', desc: 'Air displacement sweep for cuts & wipes' },
                { type: 'boom', name: 'Sub-Bass Cinematic Boom', desc: 'Heavy sub-bass impact for dramatic reveal' },
                { type: 'glitch', name: 'Digital Glitch Burst', desc: 'Electromagnetic static glitch stinger' },
                { type: 'pop', name: 'Snappy UI Pop', desc: 'Crisp percussive bubble pop for titles' },
                { type: 'bell', name: 'Pristine Studio Chime', desc: 'Harmonic crystal bell accent' },
                { type: 'riser', name: 'Tension Riser Buildup', desc: 'Gradual frequency swell building suspense' },
              ].map((sfx) => (
                <div
                  key={sfx.type}
                  className="p-2.5 rounded-lg bg-[#161a24] border border-[#232838] hover:border-cyan-500/40 transition flex items-center justify-between"
                >
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-neutral-200 text-xs">{sfx.name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{sfx.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handlePlayAndAddSfx(sfx.type as any, false)}
                      className="p-1.5 rounded bg-[#202636] hover:bg-cyan-500 hover:text-black text-cyan-400 transition"
                      title="Preview Sound"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={() => handlePlayAndAddSfx(sfx.type as any, true)}
                      className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-[10px] flex items-center gap-0.5"
                      title="Add to timeline"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 3. TEXT & TITLES TAB ================= */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Animated Text & Titles</span>
                </h3>
                <p className="text-[11px] text-neutral-400">16 working animations with Urdu & RTL support</p>
              </div>
              <button
                onClick={() => onAddTextClipToTimeline('fade_in', 'SaadCut Studio', false)}
                className="px-2.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>New Text</span>
              </button>
            </div>

            {/* Urdu / RTL Special Preset */}
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-[#172033] to-[#141b2c] border border-cyan-500/40 flex items-center justify-between">
              <div>
                <span className="px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 text-[10px] font-mono">URDU / RTL</span>
                <p className="font-semibold text-neutral-100 text-xs mt-1 font-['Cairo']">سعد کٹ اسٹوڈیو پرو</p>
                <p className="text-[10px] text-neutral-400">Right-to-left Nastaliq title template</p>
              </div>
              <button
                onClick={() => onAddTextClipToTimeline('cinematic_title', 'سعد کٹ اسٹوڈیو', true)}
                className="px-2 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-[10px] flex items-center gap-1"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>

            {/* List of text animation presets */}
            <div className="space-y-1.5">
              {TEXT_ANIMATIONS.map((anim) => (
                <div
                  key={anim.id}
                  className="p-2 rounded-lg bg-[#161a24] border border-[#232838] hover:border-cyan-500/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-200">{anim.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#202738] text-neutral-400">{anim.category}</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{anim.description}</p>
                  </div>
                  <button
                    onClick={() => onAddTextClipToTimeline(anim.id)}
                    className="px-2 py-1 rounded bg-[#202636] hover:bg-cyan-500 hover:text-black text-cyan-400 font-semibold text-[10px] transition shrink-0 ml-2"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 4. COLOR GRADING PRESETS TAB ================= */}
        {activeTab === 'filters' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Original Cinematic Presets</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {selectedClip
                  ? `Select a preset to grade "${selectedClip.name}"`
                  : 'Select a clip on the timeline first, or click a preset to prepare it.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CINEMATIC_COLOR_PRESETS.map((preset) => {
                const isActive = selectedClip?.colorGrading.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyColorPreset(preset.id)}
                    className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#1c2438] border-cyan-400 ring-1 ring-cyan-400/50'
                        : 'bg-[#151822] border-[#222838] hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Gradient color preview swatch */}
                    <div
                      className="w-full h-10 rounded-md mb-2 shadow-inner border border-white/10"
                      style={{ background: preset.thumbnailColor }}
                    />
                    <div>
                      <p className="font-semibold text-neutral-200 text-xs truncate">{preset.name}</p>
                      <p className="text-[10px] text-cyan-400/80 font-mono">{preset.category}</p>
                      <p className="text-[9px] text-neutral-500 mt-0.5 line-clamp-2 leading-tight">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
