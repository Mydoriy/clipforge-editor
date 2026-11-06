// Golden Frame, Image Metrics (SSIM / PSNR) & Edge Case Normalizer
export interface ImageComparisonResult {
  psnr: number; // in dB (>= 40 dB is broadcast quality)
  ssim: number; // 0.0 - 1.0 (>= 0.98 is golden match)
  maxDiff: number;
  isMatch: boolean;
}

// 1. Compute PSNR (Peak Signal-to-Noise Ratio) between two RGBA buffers
export function computePSNR(dataA: Uint8ClampedArray | Uint8Array, dataB: Uint8ClampedArray | Uint8Array): number {
  if (dataA.length !== dataB.length || dataA.length === 0) return 0;

  let sumSquaredError = 0;
  for (let i = 0; i < dataA.length; i++) {
    const diff = dataA[i] - dataB[i];
    sumSquaredError += diff * diff;
  }

  const mse = sumSquaredError / dataA.length;
  if (mse === 0) return 100.0; // Identical images (treated as 100 dB)

  return 10 * Math.log10((255 * 255) / mse);
}

// 2. Compute SSIM (Structural Similarity Index) between two RGBA buffers
export function computeSSIM(dataA: Uint8ClampedArray | Uint8Array, dataB: Uint8ClampedArray | Uint8Array): number {
  if (dataA.length !== dataB.length || dataA.length === 0) return 0;

  const n = dataA.length;
  let sumA = 0;
  let sumB = 0;

  for (let i = 0; i < n; i++) {
    sumA += dataA[i];
    sumB += dataB[i];
  }

  const meanA = sumA / n;
  const meanB = sumB / n;

  let varA = 0;
  let varB = 0;
  let covarAB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = dataA[i] - meanA;
    const diffB = dataB[i] - meanB;
    varA += diffA * diffA;
    varB += diffB * diffB;
    covarAB += diffA * diffB;
  }

  varA /= (n - 1 || 1);
  varB /= (n - 1 || 1);
  covarAB /= (n - 1 || 1);

  const c1 = 6.5025; // (0.01 * 255)^2
  const c2 = 58.5225; // (0.03 * 255)^2

  const numerator = (2 * meanA * meanB + c1) * (2 * covarAB + c2);
  const denominator = (meanA * meanA + meanB * meanB + c1) * (varA + varB + c2);

  return denominator === 0 ? 1 : Math.max(0, Math.min(1, numerator / denominator));
}

// 3. Compare two frame buffers (Preview vs Export)
export function compareFrames(
  bufferA: Uint8ClampedArray | Uint8Array,
  bufferB: Uint8ClampedArray | Uint8Array,
  ssimThreshold = 0.98,
  psnrThreshold = 40.0
): ImageComparisonResult {
  const psnr = computePSNR(bufferA, bufferB);
  const ssim = computeSSIM(bufferA, bufferB);

  let maxDiff = 0;
  const len = Math.min(bufferA.length, bufferB.length);
  for (let i = 0; i < len; i++) {
    const d = Math.abs(bufferA[i] - bufferB[i]);
    if (d > maxDiff) maxDiff = d;
  }

  return {
    psnr,
    ssim,
    maxDiff,
    isMatch: ssim >= ssimThreshold && psnr >= psnrThreshold
  };
}

// 4. Measure Audio/Video Sync Drift (Threshold: <= 40ms)
export function measureAVSyncOffset(videoTime: number, audioTime: number): {
  driftMs: number;
  inSync: boolean;
} {
  const driftMs = Math.abs(videoTime - audioTime) * 1000;
  return {
    driftMs,
    inSync: driftMs <= 40.0 // Must not exceed 40ms
  };
}

// 5. 10-bit / HDR to 8-bit sRGB Tone Mapping (Reinhard Curve)
export function toneMapHdrToSrgb(r: number, g: number, b: number, maxLuminance = 1.0): [number, number, number] {
  // Reinhard tone mapping: color / (1 + color)
  const mapChannel = (val: number) => {
    const normalized = Math.max(0, val / maxLuminance);
    const mapped = normalized / (1.0 + normalized);
    return Math.round(Math.min(255, Math.max(0, mapped * 255 * 1.5)));
  };

  return [mapChannel(r), mapChannel(g), mapChannel(b)];
}

// 6. Handle Smartphone EXIF / Rotation Metadata (90, 180, 270 deg)
export function normalizeVideoOrientation(
  orientationDeg: number,
  width: number,
  height: number
): { width: number; height: number; rotateDeg: number } {
  const deg = (orientationDeg % 360 + 360) % 360;
  if (deg === 90 || deg === 270) {
    return { width: height, height: width, rotateDeg: deg };
  }
  return { width, height, rotateDeg: deg };
}

// 7. Audio Sample Rate & Channel Resampler (44.1kHz vs 48kHz, Mono vs Stereo)
export function resampleAudioBuffer(
  input: Float32Array,
  fromRate: number,
  toRate: number,
  inputChannels: number,
  targetChannels: number
): Float32Array {
  if (input.length === 0) return new Float32Array(0);

  // 1. Resample rate
  const ratio = toRate / fromRate;
  const numInputFrames = Math.floor(input.length / inputChannels);
  const numOutputFrames = Math.floor(numInputFrames * ratio);
  const resampledMono = new Float32Array(numOutputFrames);

  for (let i = 0; i < numOutputFrames; i++) {
    const srcIndex = i / ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(numInputFrames - 1, i0 + 1);
    const fract = srcIndex - i0;

    // Downmix source channels to mono for interpolation
    let sample0 = 0;
    let sample1 = 0;
    for (let c = 0; c < inputChannels; c++) {
      sample0 += input[i0 * inputChannels + c] / inputChannels;
      sample1 += input[i1 * inputChannels + c] / inputChannels;
    }

    resampledMono[i] = sample0 + fract * (sample1 - sample0);
  }

  // 2. Expand to target channels
  if (targetChannels === 1) return resampledMono;

  const output = new Float32Array(numOutputFrames * targetChannels);
  for (let i = 0; i < numOutputFrames; i++) {
    for (let c = 0; c < targetChannels; c++) {
      output[i * targetChannels + c] = resampledMono[i];
    }
  }
  return output;
}
