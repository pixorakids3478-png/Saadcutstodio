import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Storage directories
const uploadsDir = path.join(__dirname, 'uploads');
const exportsDir = path.join(__dirname, 'exports');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static media access
app.use('/uploads', express.static(uploadsDir));
app.use('/exports', express.static(exportsDir));

// Multer config for real file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } }); // 1GB limit

// Active rendering jobs tracking
interface ActiveJob {
  id: string;
  process?: any;
  status: 'rendering' | 'completed' | 'error' | 'cancelled';
  percent: number;
  fps: number;
  currentFrame: number;
  totalDuration: number;
  elapsedSeconds: number;
  error?: string;
  outputPath?: string;
  outputFilename?: string;
  startTime: number;
}

const activeJobs = new Map<string, ActiveJob>();

// 1. System info & FFmpeg detection
app.get('/api/system-info', (_req, res) => {
  let ffmpegAvailable = false;
  let ffmpegVersion = 'Not Detected';
  let ffmpegPath = '/usr/bin/ffmpeg';

  try {
    const out = execSync('ffmpeg -version', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString();
    ffmpegAvailable = true;
    const match = out.match(/ffmpeg version ([\w.-]+)/);
    ffmpegVersion = match ? match[1] : 'Installed';
  } catch (err) {
    // Check if custom windows or bundled binary exists
    const winBin = path.join(__dirname, 'bin', 'ffmpeg.exe');
    if (fs.existsSync(winBin)) {
      ffmpegAvailable = true;
      ffmpegPath = winBin;
      ffmpegVersion = 'Bundled Windows Binary';
    }
  }

  res.json({
    appName: 'SaadCut Studio',
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch,
    ffmpegAvailable,
    ffmpegVersion,
    ffmpegPath,
    offlineMode: true,
    capabilities: {
      hardwareAcceleration: 'VAAPI / NVENC / QuickSync (if supported)',
      fourKExport: true,
      audioMixing: true,
      colorGrading: true,
    },
  });
});

// 2. Upload real media files
app.post('/api/upload-media', upload.single('mediaFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received' });
  }

  const file = req.file;
  const localPath = file.path;
  const url = `/uploads/${file.filename}`;

  // Read metadata with ffprobe if available
  let duration = 5.0;
  let width = 1920;
  let height = 1080;
  let fps = 30;

  try {
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate,duration -of json "${localPath}"`,
      { timeout: 4000 }
    ).toString();
    const data = JSON.parse(probe);
    if (data.format && data.format.duration) {
      duration = parseFloat(data.format.duration);
    }
    const vStream = data.streams?.find((s: any) => s.width && s.height);
    if (vStream) {
      width = vStream.width;
      height = vStream.height;
      if (vStream.r_frame_rate) {
        const [n, d] = vStream.r_frame_rate.split('/');
        if (d && parseFloat(d) > 0) fps = Math.round(parseFloat(n) / parseFloat(d));
      }
    }
  } catch {
    // Fallback if ffprobe is not accessible
  }

  res.json({
    id: `media_${Date.now()}`,
    name: file.originalname,
    filename: file.filename,
    localPath,
    url,
    size: file.size,
    duration,
    width,
    height,
    fps,
  });
});

// 3. Render FFmpeg timeline export
app.post('/api/render-ffmpeg', (req, res) => {
  const { jobId, filterComplex, inputs, videoMap, audioMap, outputArgs, filename, totalDuration } = req.body;

  if (!jobId || !filterComplex) {
    return res.status(400).json({ error: 'Missing required render parameters' });
  }

  const outName = filename || `SaadCut_Export_${Date.now()}.mp4`;
  const outPath = path.join(exportsDir, outName);

  const job: ActiveJob = {
    id: jobId,
    status: 'rendering',
    percent: 0,
    fps: 0,
    currentFrame: 0,
    totalDuration: totalDuration || 10,
    elapsedSeconds: 0,
    outputPath: outPath,
    outputFilename: outName,
    startTime: Date.now(),
  };

  activeJobs.set(jobId, job);

  // Construct FFmpeg arguments array
  const args: string[] = ['-hide_banner', '-nostats'];

  // Add inputs
  if (Array.isArray(inputs)) {
    for (const inp of inputs) {
      args.push('-i', inp.path);
    }
  }

  // Add filter complex
  args.push('-filter_complex', filterComplex);

  // Add maps
  if (videoMap) args.push('-map', videoMap);
  if (audioMap) args.push('-map', audioMap);

  // Add custom output args
  if (Array.isArray(outputArgs)) {
    args.push(...outputArgs);
  }

  args.push(outPath);

  console.log('[SaadCut FFmpeg] Launching render job:', jobId);
  console.log('Command: ffmpeg', args.join(' '));

  try {
    const ffProcess = spawn('ffmpeg', args);
    job.process = ffProcess;

    ffProcess.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      // Parse progress: time=00:00:04.25
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);

      if (fpsMatch) {
        job.fps = parseFloat(fpsMatch[1]);
      }

      if (timeMatch) {
        const hours = parseFloat(timeMatch[1]);
        const mins = parseFloat(timeMatch[2]);
        const secs = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + mins * 60 + secs;
        const total = job.totalDuration || 10;
        const pct = Math.min(99, Math.max(1, (currentTime / total) * 100));
        job.percent = Math.round(pct);
        job.elapsedSeconds = Math.round((Date.now() - job.startTime) / 1000);
      }
    });

    ffProcess.on('close', (code: number) => {
      if (code === 0) {
        console.log('[SaadCut FFmpeg] Job completed successfully:', jobId);
        job.status = 'completed';
        job.percent = 100;
        job.elapsedSeconds = Math.round((Date.now() - job.startTime) / 1000);
      } else if (job.status !== 'cancelled') {
        console.error('[SaadCut FFmpeg] Render exited with code', code);
        job.status = 'error';
        job.error = `FFmpeg process exited with code ${code}. Check media tracks or codecs.`;
      }
    });

    ffProcess.on('error', (err: Error) => {
      console.error('[SaadCut FFmpeg] Process error:', err);
      job.status = 'error';
      job.error = err.message;
    });

    res.json({
      jobId,
      status: 'rendering',
      message: 'Render initiated',
      outputPath: outPath,
    });
  } catch (err: any) {
    job.status = 'error';
    job.error = err.message;
    res.status(500).json({ error: err.message });
  }
});

// 4. Check render progress
app.get('/api/render-progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const remaining =
    job.percent > 0 && job.percent < 100
      ? Math.max(0, Math.round(((100 - job.percent) / job.percent) * job.elapsedSeconds))
      : 0;

  res.json({
    jobId: job.id,
    status: job.status,
    percent: job.percent,
    fps: job.fps,
    elapsedSeconds: Math.round((Date.now() - job.startTime) / 1000),
    estimatedRemainingSeconds: remaining,
    error: job.error,
    outputFilename: job.outputFilename,
    downloadUrl: job.status === 'completed' ? `/exports/${job.outputFilename}` : undefined,
  });
});

// 5. Cancel render job
app.post('/api/cancel-render/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (job && job.process) {
    try {
      job.process.kill('SIGTERM');
      job.status = 'cancelled';
    } catch {}
  }

  res.json({ success: true, message: 'Job cancelled' });
});

// 6. Download rendered file
app.get('/api/download-render/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(exportsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename);
});

// Launch server with Vite dev middlewares
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SaadCut Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
