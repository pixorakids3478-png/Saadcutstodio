import React, { useRef } from 'react';
import {
  Film,
  FolderOpen,
  Save,
  FilePlus,
  Undo2,
  Redo2,
  Download,
  Settings,
  MonitorPlay,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { AspectRatio, ProjectSettings } from '../types/editor';

interface HeaderToolbarProps {
  projectSettings: ProjectSettings;
  onUpdateProjectSettings: (newSettings: Partial<ProjectSettings>) => void;
  onNewProject: () => void;
  onImportMedia: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenExportModal: () => void;
  onOpenSettingsModal: () => void;
  isAutosaved: boolean;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  projectSettings,
  onUpdateProjectSettings,
  onNewProject,
  onImportMedia,
  onSaveProject,
  onLoadProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenExportModal,
  onOpenSettingsModal,
  isAutosaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadProject(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-[#0d0e12] border-b border-[#1f2430] flex items-center justify-between px-4 select-none shrink-0 z-30">
      {/* Hidden file input for loading project */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".saadcut,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Left: Branding & Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white font-['Inter']">
                SAADCUT <span className="text-cyan-400 font-extrabold">STUDIO</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#191d28] border border-[#262c3d] text-cyan-400 font-medium">
                PRO 4K
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-[#1e2330] mx-1" />

        {/* Inline editable Project Title */}
        <input
          type="text"
          value={projectSettings.title}
          onChange={(e) => onUpdateProjectSettings({ title: e.target.value })}
          className="bg-transparent hover:bg-[#161a24] focus:bg-[#161a24] border border-transparent hover:border-[#283044] focus:border-cyan-500/60 rounded px-2.5 py-1 text-xs text-neutral-200 font-medium transition w-44 focus:w-60 focus:outline-none"
          title="Click to rename project"
        />

        {/* Autosave status indicator */}
        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-neutral-400">Autosaved</span>
        </div>
      </div>

      {/* Center: Quick Action Operations */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white text-xs font-medium transition border border-transparent hover:border-[#252c3d]"
          title="New Project (Ctrl+N)"
        >
          <FilePlus className="w-3.5 h-3.5 text-neutral-400" />
          <span>New</span>
        </button>

        <button
          onClick={onImportMedia}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white text-xs font-medium transition border border-transparent hover:border-[#252c3d]"
          title="Import Media (Ctrl+I)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
          <span>Import</span>
        </button>

        <button
          onClick={onSaveProject}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white text-xs font-medium transition border border-transparent hover:border-[#252c3d]"
          title="Save Project (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-neutral-400" />
          <span>Save</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white text-xs font-medium transition border border-transparent hover:border-[#252c3d]"
          title="Open .saadcut Project"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Open</span>
        </button>

        <div className="h-4 w-[1px] bg-[#1e2330] mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md hover:bg-[#191e2b] text-neutral-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-[#1e2330] mx-1" />

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1 bg-[#141721] px-2 py-1 rounded-md border border-[#222838]">
          <span className="text-[10px] text-neutral-400 uppercase font-mono">Aspect</span>
          <select
            value={projectSettings.aspectRatio}
            onChange={(e) => onUpdateProjectSettings({ aspectRatio: e.target.value as AspectRatio })}
            className="bg-transparent text-xs text-neutral-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="16:9" className="bg-[#12141c]">16:9 (Landscape)</option>
            <option value="9:16" className="bg-[#12141c]">9:16 (Shorts/Reels)</option>
            <option value="1:1" className="bg-[#12141c]">1:1 (Square)</option>
            <option value="21:9" className="bg-[#12141c]">21:9 (Cinema)</option>
            <option value="4:5" className="bg-[#12141c]">4:5 (Social)</option>
          </select>
        </div>

        {/* FPS selector */}
        <div className="flex items-center gap-1 bg-[#141721] px-2 py-1 rounded-md border border-[#222838]">
          <select
            value={projectSettings.fps}
            onChange={(e) => onUpdateProjectSettings({ fps: parseInt(e.target.value, 10) as any })}
            className="bg-transparent text-xs text-neutral-200 font-mono font-medium focus:outline-none cursor-pointer"
          >
            <option value="24" className="bg-[#12141c]">24 FPS (Film)</option>
            <option value="25" className="bg-[#12141c]">25 FPS (PAL)</option>
            <option value="30" className="bg-[#12141c]">30 FPS (Standard)</option>
            <option value="60" className="bg-[#12141c]">60 FPS (Smooth)</option>
          </select>
        </div>
      </div>

      {/* Right: Settings & Primary Export Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettingsModal}
          className="p-2 rounded-md hover:bg-[#191e2b] text-neutral-400 hover:text-neutral-200 transition border border-transparent hover:border-[#252c3d]"
          title="Project Settings & Offline System Checklist"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
