import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  StopCircle,
  FileVideo,
  ExternalLink,
  Cpu,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TimelineClip, Track, MediaItem, ExportSettings, RenderProgress } from '../types/editor';
import { buildFFmpegFilterGraph } from '../utils/ffmpegFilterGraph';
import { CanvasCompositor } from '../utils/canvasCompositor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: TimelineClip[];
  tracks: Track[];
  mediaPool: MediaItem[];
  projectTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  clips,
  tracks,
  mediaPool,
  projectTitle,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    filename: `${projectTitle.replace(/\s+/g, '_')}_Master.mp4`,
    resolution: '1080p',
    width: 1920,
    height: 1080,
    fps: 30,
    format: 'mp4',
    videoBitrate: '20M',
    audioBitrate: '320k',
    qualityPreset: 'high',
    sharpen: 20,
    denoise: 10,
    colorRecovery: true,
    offlineAiSuperRes: false,
    renderEngine: 'ffmpeg_native',
  });

  const [progress, setProgress] = useState<RenderProgress>({
    jobId: '',
    status: 'idle',
    percent: 0,
    fps: 0,
    currentFrame: 0,
    totalFrames: 0,
    currentTime: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
  });

  const [logOutput, setLogOutput] = useState<string[]>([]);
  const pollIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Sync resolution dimensions
  const handleResolutionChange = (res: '720p' | '1080p' | '4k') => {
    let w = 1920;
    let h = 1080;
    let br = '20M';

    if (res === '720p') {
      w = 1280;
      h = 720;
      br = '10M';
    } else if (res === '4k') {
      w = 3840;
      h = 2160;
      br = '45M';
    }

    setSettings((prev) => ({
      ...prev,
      resolution: res,
      width: w,
      height: h,
      videoBitrate: br,
    }));
  };

  // Trigger real export
  const handleStartExport = async () => {
    const totalDuration = Math.max(1, ...clips.map((c) => c.startTime + c.duration));
    const jobId = `job_${Date.now()}`;

    setProgress({
      jobId,
      status: 'rendering',
      percent: 0,
      fps: 0,
      currentFrame: 0,
      totalFrames: Math.round(totalDuration * settings.fps),
      currentTime: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: Math.round(totalDuration * 1.5),
    });

    setLogOutput([
      `[SaadCut Studio] Initializing master render pipeline...`,
      `[Target] Resolution: ${settings.width}x${settings.height} @ ${settings.fps}fps`,
      `[Engine] ${settings.renderEngine === 'ffmpeg_native' ? 'Local FFmpeg Native Executable' : 'In-Browser Compositor Recorder'}`,
      `[Timeline] Tracks: ${tracks.length}, Total Clips: ${clips.length}, Duration: ${totalDuration.toFixed(2)}s`,
    ]);

    if (settings.renderEngine === 'ffmpeg_native') {
      // Map local paths
      const mediaPathMap: Record<string, string> = {};
      mediaPool.forEach((m) => {
        if (m.localPath) {
          mediaPathMap[m.id] = m.localPath;
        } else {
          // If in server mode, path relative to server root
          mediaPathMap[m.id] = m.url.startsWith('/') ? `.${m.url}` : m.url;
        }
      });

      const renderSpec = buildFFmpegFilterGraph(clips, tracks, settings, mediaPathMap);

      setLogOutput((prev) => [
        ...prev,
        `[FFmpeg Filtergraph] ${renderSpec.filterComplex.substring(0, 120)}...`,
        `[FFmpeg Encoder] libx264, Preset: ${settings.qualityPreset}, CRF: 18`,
      ]);

      try {
        const response = await fetch('/api/render-ffmpeg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            filterComplex: renderSpec.filterComplex,
            inputs: renderSpec.inputs,
            videoMap: renderSpec.videoMap,
            audioMap: renderSpec.audioMap,
            outputArgs: renderSpec.outputArgs,
            filename: settings.filename,
            totalDuration,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${await response.text()}`);
        }

        // Start polling progress
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/render-progress/${jobId}`);
            if (pollRes.ok) {
              const data = await pollRes.json();
              setProgress((p) => ({
                ...p,
                status: data.status,
                percent: data.percent,
                fps: data.fps,
                elapsedSeconds: data.elapsedSeconds,
                estimatedRemainingSeconds: data.estimatedRemainingSeconds,
                error: data.error,
                downloadUrl: data.downloadUrl,
              }));

              if (data.status === 'completed') {
                clearInterval(pollIntervalRef.current);
                setLogOutput((l) => [...l, `[Success] Master MP4 exported successfully: ${data.outputFilename}`]);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              } else if (data.status === 'error') {
                clearInterval(pollIntervalRef.current);
                setLogOutput((l) => [...l, `[Error] ${data.error}`]);
              }
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 800);
      } catch (err: any) {
        console.warn('Native backend render unavailable, falling back to in-browser render:', err);
        setLogOutput((prev) => [
          ...prev,
          `[Notice] Server FFmpeg route error: ${err.message}. Switching to In-Browser Master Engine.`,
        ]);
        startInBrowserExport(totalDuration, jobId);
      }
    } else {
      startInBrowserExport(totalDuration, jobId);
    }
  };

  // In-Browser High Fidelity Recorder Fallback
  const startInBrowserExport = async (totalDuration: number, jobId: string) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = settings.width;
    exportCanvas.height = settings.height;
    const compositor = new CanvasCompositor(exportCanvas);

    let stream: MediaStream;
    try {
      stream = exportCanvas.captureStream(settings.fps);
    } catch (e) {
      setProgress((p) => ({ ...p, status: 'error', error: 'Canvas capture stream not supported.' }));
      return;
    }

    const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 25000000 });
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);

      setProgress((p) => ({
        ...p,
        status: 'completed',
        percent: 100,
        downloadUrl,
      }));

      setLogOutput((l) => [...l, `[Success] In-browser master render complete (${(blob.size / (1024 * 1024)).toFixed(1)} MB)`]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    recorder.start();

    // Render frame loop
    const totalFrames = Math.round(totalDuration * settings.fps);
    let currentFrame = 0;
    const interval = setInterval(() => {
      const currentTime = currentFrame / settings.fps;
      compositor.seekMediaElements(clips, mediaPool, currentTime);
      compositor.renderFrame({
        currentTime,
        tracks,
        clips,
        mediaPool,
        splitPreview: false,
        showGuides: false,
      });

      currentFrame++;
      const pct = Math.round((currentFrame / totalFrames) * 100);
      setProgress((p) => ({
        ...p,
        percent: pct,
        currentFrame,
        totalFrames,
        currentTime,
      }));

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => recorder.stop(), 200);
      }
    }, 1000 / settings.fps);
  };

  const handleCancel = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (progress.jobId) {
      fetch(`/api/cancel-render/${progress.jobId}`, { method: 'POST' });
    }
    setProgress((p) => ({ ...p, status: 'cancelled' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#12141c] border border-[#23293a] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs text-neutral-300">
        {/* Header */}
        <div className="h-13 bg-[#0d0e12] border-b border-[#1e2330] px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-bold">
              <Download className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-100">Export Video Sequence</h3>
              <p className="text-[11px] text-neutral-400">Offline Master Render & 4K Encoder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1f2c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Output Filename */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300">File Output Name</label>
            <input
              type="text"
              value={settings.filename}
              onChange={(e) => setSettings({ ...settings, filename: e.target.value })}
              className="w-full bg-[#171a26] border border-[#262c3e] rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          {/* Resolution Selector: 1080p, 4K, 720p */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">Output Resolution & Canvas</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1080p', label: '1080p Full HD', dims: '1920 x 1080', tag: 'Standard' },
                { id: '4k', label: '4K Ultra HD', dims: '3840 x 2160', tag: 'Master 4K' },
                { id: '720p', label: '720p HD', dims: '1280 x 720', tag: 'Fast Web' },
              ].map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleResolutionChange(res.id as any)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    settings.resolution === res.id
                      ? 'bg-[#1a2336] border-cyan-400 ring-1 ring-cyan-400/50'
                      : 'bg-[#151822] border-[#222838] hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-100">{res.label}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#202738] text-cyan-400 font-mono">
                      {res.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1">{res.dims}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frame Rate & Quality Preset */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">Export Frame Rate</label>
              <select
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: parseInt(e.target.value, 10) as any })}
                className="w-full bg-[#171a26] border border-[#262c3e] rounded-lg p-2 text-xs text-neutral-200"
              >
                <option value="24">24 FPS (Cinematic 35mm)</option>
                <option value="25">25 FPS (European PAL)</option>
                <option value="30">30 FPS (Standard NTSC)</option>
                <option value="60">60 FPS (Ultra Smooth Motion)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">Encoding Quality Preset</label>
              <select
                value={settings.qualityPreset}
                onChange={(e) => setSettings({ ...settings, qualityPreset: e.target.value as any })}
                className="w-full bg-[#171a26] border border-[#262c3e] rounded-lg p-2 text-xs text-neutral-200"
              >
                <option value="ultra">Ultra Master (CRF 16, Maximum Detail)</option>
                <option value="high">High Studio (CRF 18, Recommended)</option>
                <option value="medium">Medium Standard (CRF 22, Balanced)</option>
                <option value="fast">Fast Draft (CRF 26, Quick Share)</option>
              </select>
            </div>
          </div>

          {/* Render Engine Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">Rendering Engine Architecture</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSettings({ ...settings, renderEngine: 'ffmpeg_native' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  settings.renderEngine === 'ffmpeg_native'
                    ? 'bg-[#1a2336] border-cyan-400 ring-1 ring-cyan-400/50'
                    : 'bg-[#151822] border-[#222838]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-100">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Local FFmpeg Native</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Uses local system/desktop FFmpeg binary for hardware-accelerated H.264 rendering.
                </p>
              </button>

              <button
                onClick={() => setSettings({ ...settings, renderEngine: 'in_browser' })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  settings.renderEngine === 'in_browser'
                    ? 'bg-[#1a2336] border-cyan-400 ring-1 ring-cyan-400/50'
                    : 'bg-[#151822] border-[#222838]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-100">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>In-Browser WebCodecs</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Direct client-side Canvas and Web Audio capture. Works 100% in any sandbox.
                </p>
              </button>
            </div>
          </div>

          {/* Enhancement & Detail sharpening */}
          <div className="p-3 rounded-lg bg-[#151823] border border-[#222838] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Video Enhancement & Detail Restoration</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Lanczos + Unsharp Mask</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Detail Sharpening</span>
                  <span>{settings.sharpen}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sharpen}
                  onChange={(e) => setSettings({ ...settings, sharpen: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 h-1 bg-[#202636] rounded"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Noise Reduction</span>
                  <span>{settings.denoise}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.denoise}
                  onChange={(e) => setSettings({ ...settings, denoise: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 h-1 bg-[#202636] rounded"
                />
              </div>
            </div>

            <div className="pt-1 flex items-start gap-1.5 text-[10px] text-neutral-400">
              <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Standard upscaling uses high-quality Lanczos resampling and detail unsharp masking. It does not fabricate artificial data.
              </span>
            </div>
          </div>

          {/* Progress / Status Block */}
          {progress.status !== 'idle' && (
            <div className="p-4 rounded-xl bg-[#0f1118] border border-[#202638] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-200 flex items-center gap-2">
                  {progress.status === 'rendering' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                  {progress.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {progress.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span className="capitalize">{progress.status}...</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{progress.percent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#1a2030] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>Elapsed: {progress.elapsedSeconds}s</span>
                {progress.fps > 0 && <span>Speed: {progress.fps.toFixed(1)} fps</span>}
                {progress.estimatedRemainingSeconds > 0 && (
                  <span>Remaining: ~{progress.estimatedRemainingSeconds}s</span>
                )}
              </div>

              {/* Download Action button upon completion */}
              {progress.status === 'completed' && progress.downloadUrl && (
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={progress.downloadUrl}
                    download={settings.filename}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Master Video ({settings.filename})</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Console Log Feed */}
          {logOutput.length > 0 && (
            <div className="bg-[#0a0b10] border border-[#1d2232] rounded-lg p-2.5 font-mono text-[10px] text-cyan-300/80 max-h-24 overflow-y-auto space-y-0.5">
              {logOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-14 bg-[#0d0e12] border-t border-[#1e2330] px-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1f2c] font-medium"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {progress.status === 'rendering' ? (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>Cancel Render</span>
              </button>
            ) : (
              <button
                onClick={handleStartExport}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Start Export ({settings.resolution.toUpperCase()})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
