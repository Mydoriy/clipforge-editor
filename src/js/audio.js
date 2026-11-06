/* ==========================================================================
   CLIPFORGE - WEB AUDIO & SYNTHESIZER ENGINE
   ========================================================================== */
let audioCtx = null;
let audioGainNode = null;
let audioSampleBuffers = new Map();
let activeAudioSources = [];

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    audioGainNode = audioCtx.createGain();
    audioGainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playAudioClips() {
  stopAudioClips();
  const ctx = getAudioContext();
  if (!ctx) return;

  project.clips.filter(c => c.type === 'audio').forEach(clip => {
    if (playheadTime >= clip.start && playheadTime < (clip.start + clip.duration)) {
      const buffer = audioSampleBuffers.get(clip.assetId);
      if (buffer) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = clip.volume ?? 1.0;
        src.connect(gain);
        gain.connect(audioGainNode);

        const offset = (playheadTime - clip.start) * clip.speed + clip.inPoint;
        const remaining = (clip.duration - (playheadTime - clip.start)) / clip.speed;
        src.start(0, Math.max(0, offset), Math.max(0, remaining));
        activeAudioSources.push(src);
      }
    }
  });
}

function stopAudioClips() {
  activeAudioSources.forEach(src => {
    try { src.stop(); src.disconnect(); } catch (e) {}
  });
  activeAudioSources = [];
}

// Procedural 15-second TikTok Lo-Fi Synth Beat (Zero External Audio Assets Needed)
function generateProceduralSynthBeat() {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 15.0;
  const length = Math.floor(sampleRate * duration);
  const audioBuffer = ctx.createBuffer(2, length, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const bpm = 124;
  const beatDuration = 60 / bpm;
  const totalBeats = Math.floor(duration / beatDuration);

  for (let b = 0; b < totalBeats; b++) {
    const beatStartSample = Math.floor(b * beatDuration * sampleRate);
    const isKick = (b % 2 === 0);
    const isSnare = (b % 2 === 1);

    if (isKick) {
      const kickLen = Math.floor(0.25 * sampleRate);
      for (let i = 0; i < kickLen && (beatStartSample + i) < length; i++) {
        const t = i / sampleRate;
        const freq = 130 * Math.exp(-t * 22);
        const env = Math.exp(-t * 14);
        const s = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
        left[beatStartSample + i] += s;
        right[beatStartSample + i] += s;
      }
    }

    if (isSnare) {
      const snareLen = Math.floor(0.2 * sampleRate);
      for (let i = 0; i < snareLen && (beatStartSample + i) < length; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18);
        const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 25) * 0.4;
        const s = (noise + tone) * 0.5;
        left[beatStartSample + i] += s;
        right[beatStartSample + i] += s;
      }
    }

    for (let sub = 0; sub < 4; sub++) {
      const hatStart = beatStartSample + Math.floor(sub * (beatDuration / 4) * sampleRate);
      const hatLen = Math.floor(0.04 * sampleRate);
      for (let i = 0; i < hatLen && (hatStart + i) < length; i++) {
        const t = i / sampleRate;
        const s = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.15;
        left[hatStart + i] += s;
        right[hatStart + i] += s;
      }
    }

    const chordFreqs = [55, 65.41, 73.42, 82.41];
    const noteFreq = chordFreqs[Math.floor(b / 4) % chordFreqs.length];
    const bassLen = Math.floor(beatDuration * 0.9 * sampleRate);
    for (let i = 0; i < bassLen && (beatStartSample + i) < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 4);
      const s = Math.sin(2 * Math.PI * noteFreq * t) * env * 0.25;
      left[beatStartSample + i] += s;
      right[beatStartSample + i] += s;
    }
  }

  return audioBuffer;
}

// Beat Sync Audio Analysis
function analyzeAudioBeats(audioBuffer) {
  if (!audioBuffer) return [];
  const sampleRate = audioBuffer.sampleRate;
  const rawData = audioBuffer.getChannelData(0);
  const frameSize = 1024;
  const totalFrames = Math.floor(rawData.length / frameSize);
  const energies = new Float32Array(totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    let sum = 0;
    const offset = i * frameSize;
    for (let j = 0; j < frameSize; j++) {
      const val = rawData[offset + j];
      sum += val * val;
    }
    energies[i] = sum / frameSize;
  }

  const beats = [];
  const windowFrames = 30;
  let lastBeatTime = -1;

  for (let i = windowFrames; i < totalFrames - windowFrames; i++) {
    let avg = 0;
    for (let w = -windowFrames; w <= windowFrames; w++) {
      avg += energies[i + w];
    }
    avg /= (windowFrames * 2 + 1);

    const curTime = (i * frameSize) / sampleRate;
    if (energies[i] > avg * 1.35 && (curTime - lastBeatTime) > 0.28) {
      beats.push(parseFloat(curTime.toFixed(3)));
      lastBeatTime = curTime;
    }
  }
  return beats;
}
