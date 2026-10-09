# SaadCut Studio — Professional Offline Video Editor

**SaadCut Studio** is a desktop video editor engineered for Windows and modern web runtimes, featuring a multi-track timeline, 12 original cinematic color grading filters, 16 animated title presets with Urdu & RTL support, speed ramping, and local FFmpeg rendering.

---

## Key Features

1. **Multi-Track Timeline Architecture**
   - Unlimited video, audio, overlay, and text tracks.
   - Non-destructive trimming, split at playhead (`S`), duplicate (`Ctrl+D`), and ripple reordering.
   - Snapping engine with magnetic alignment to clip edges and playheads.
   - Frame-accurate audio/video synchronization with calibrated timecode ruler (`00:00:00:00`).

2. **Professional Color Grading Studio**
   - 12 authentic cinematic color presets: *Filmic Cinema, Teal & Orange, Hollywood Contrast, Moody Shadows, Warm Film, Cool Blue Cinema, Natural Skin, Vintage Film, Bleach Bypass, Night Cinema, Soft Film, and Documentary Neutral*.
   - Fine-grained primary controls: Exposure, Brightness, Contrast, Saturation, Temperature (Kelvin), Tint, Highlights, Shadows, Whites, Blacks, and Gamma.
   - 3-Way Color Wheels (Lift, Gamma, Gain) and RGB balance.
   - Stylistic lens optics: Vignette feathering, 35mm film grain emulation, and 2.39:1 Cinemascope letterbox bars.
   - Real-time Before/After split-screen monitor comparison.

3. **Motion, Speed & Keyframing**
   - Smooth speed adjustment from 0.25x slow motion to 4x fast forward.
   - Reverse playback and rendering.
   - Optical-flow motion interpolation mode for silky slow motion.
   - Geometric transform: Position X/Y, Scale (10%–300%), Rotation (-180°–180°), Opacity, and Flip Horizontal/Vertical.

4. **Typography & Animated Titles (with Urdu / RTL Support)**
   - 16 functional text animations: *Typewriter, Fade In, Fade Out, Slide Left, Slide Right, Slide Up, Slide Down, Pop In, Zoom In, Zoom Out, Bounce, Tracking Reveal, Cinematic Title, Lower Third, Subtitle Style, End Credits*.
   - Full Urdu and Right-To-Left (RTL) Nastaliq support using Cairo and Urdu fonts.
   - Title-Safe and Action-Safe broadcast guides (80% / 90% viewports).

5. **Local Offline FFmpeg Master Rendering**
   - Direct execution via system `/usr/bin/ffmpeg` or Windows bundled `bin/ffmpeg.exe`.
   - Generates production-grade H.264 MP4 output with exact trims, speed changes (`setpts`), color grading filters (`eq`, `colorbalance`), audio mixing (`amix`, `afade`), and unsharp mask detail enhancement.
   - Real-time progress monitoring (percentage, encoding FPS, elapsed seconds, remaining time estimate).
   - In-browser WebCodecs fallback engine ensures exports always succeed in sandboxed environments.

---

## Running SaadCut Studio

### 1. Development Mode (Web & Full-Stack Server)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Building for Desktop (Windows Installer & Portable)
```bash
# 1. Download Windows ffmpeg.exe and place into the bin/ folder:
#    bin/ffmpeg.exe
#    bin/ffprobe.exe

# 2. Compile and package the Windows installer (.exe):
npm run electron:pack
```
The output installers will be generated in the `release/` folder:
- `release/SaadCut Studio Setup.exe` (NSIS Installer)
- `release/SaadCut Studio Portable.exe` (Standalone Portable Executable)

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **Space** | Play / Pause Preview Playback |
| **S** | Split selected clip at playhead |
| **Delete / Backspace** | Delete selected clip from timeline |
| **Ctrl + Z** | Undo last editing action |
| **Ctrl + Y** | Redo last editing action |
| **Ctrl + S** | Save project as `.saadcut` file |
| **Ctrl + D** | Duplicate selected clip |
| **Left / Right Arrow** | Step 1 frame backward / forward |
| **Shift + Left / Right** | Step 1 second backward / forward |
| **Home / End** | Jump to start / end of sequence |

---

## Offline Acceptance Test Checklist

- [x] **1. Offline Launch**: Works completely without internet connection. No mandatory CDNs or accounts.
- [x] **2. Local Media Import**: Accepts MP4, WebM, MOV, MP3, WAV, PNG, and JPG files via native file picker and drag-and-drop.
- [x] **3. Real-Time Preview**: Frame-accurate Canvas compositing engine with multi-track rendering.
- [x] **4. Timeline Split & Trimming**: Splits clips at playhead time and trims duration using edge drag handles.
- [x] **5. Cinematic Color Grading**: 12 original presets with instant intensity adjustments and Before/After split compare.
- [x] **6. Animated Text & Titles**: 16 kinetic animations with Urdu Nastaliq and RTL typing support.
- [x] **7. 1080p & 4K Export**: Real FFmpeg command pipeline producing playable MP4 files with synchronous audio.
- [x] **8. Project Persistence**: Saves and loads `.saadcut` JSON project files with background autosave recovery.
- [x] **9. Error Handling**: Graceful fallback when media files or dependencies are missing.
