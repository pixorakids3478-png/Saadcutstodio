/**
 * Offline Audio Synthesizer
 * Generates pristine cinematic SFX directly via Web Audio API
 * Converts synthesized audio to standard WAV Blob format for timeline usage and FFmpeg mixing.
 */

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

export async function generateSoundEffect(type: 'whoosh' | 'boom' | 'glitch' | 'pop' | 'bell' | 'riser'): Promise<{ blob: Blob; url: string; duration: number }> {
  const sampleRate = 44100;
  let duration = 1.0;

  switch (type) {
    case 'whoosh':
      duration = 0.8;
      break;
    case 'boom':
      duration = 2.5;
      break;
    case 'glitch':
      duration = 0.5;
      break;
    case 'pop':
      duration = 0.25;
      break;
    case 'bell':
      duration = 1.8;
      break;
    case 'riser':
      duration = 3.0;
      break;
  }

  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  if (type === 'whoosh') {
    // White noise through sweeping bandpass filter
    const bufferSize = sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(200, 0);
    filter.frequency.exponentialRampToValueAtTime(3200, duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(150, duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.linearRampToValueAtTime(0.8, duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();
  } else if (type === 'boom') {
    // Sub-bass sine with pitch drop + noise tail
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, 0);
    osc.frequency.exponentialRampToValueAtTime(30, duration * 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  } else if (type === 'glitch') {
    // Stepped square tones with noise burst
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, 0);
    osc.frequency.setValueAtTime(240, 0.08);
    osc.frequency.setValueAtTime(1400, 0.16);
    osc.frequency.setValueAtTime(450, 0.28);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  } else if (type === 'pop') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, 0);
    osc.frequency.exponentialRampToValueAtTime(120, duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  } else if (type === 'bell') {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, 0);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, 0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2.start();
  } else {
    // Riser
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, 0);
    osc.frequency.exponentialRampToValueAtTime(2200, duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, 0);
    gain.gain.linearRampToValueAtTime(0.9, duration * 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  }

  const renderedBuffer = await ctx.startRendering();
  const blob = audioBufferToWav(renderedBuffer);
  const url = URL.createObjectURL(blob);

  return { blob, url, duration };
}
