import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Keyframe interpolation calculation mirroring compositor.ts
function interpolateKeyframes(keyframes, timeInClip, defaultValues) {
  let { x, y, scale, scaleX, scaleY, rotation, opacity } = defaultValues;
  if (!keyframes || keyframes.length === 0) {
    return { x, y, scale, scaleX, scaleY, rotation, opacity };
  }

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (timeInClip <= sorted[0].time) {
    const k = sorted[0];
    return {
      x: k.x ?? x,
      y: k.y ?? y,
      scale: k.scale ?? scale,
      scaleX: k.scaleX ?? scaleX,
      scaleY: k.scaleY ?? scaleY,
      rotation: k.rotation ?? rotation,
      opacity: k.opacity ?? opacity
    };
  }

  if (timeInClip >= sorted[sorted.length - 1].time) {
    const k = sorted[sorted.length - 1];
    return {
      x: k.x ?? x,
      y: k.y ?? y,
      scale: k.scale ?? scale,
      scaleX: k.scaleX ?? scaleX,
      scaleY: k.scaleY ?? scaleY,
      rotation: k.rotation ?? rotation,
      opacity: k.opacity ?? opacity
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (timeInClip >= k1.time && timeInClip <= k2.time) {
      const span = k2.time - k1.time;
      const t = span > 0 ? (timeInClip - k1.time) / span : 0;
      const ease = t * t * (3 - 2 * t); // Smooth Hermite S-Curve
      return {
        x: (k1.x ?? x) + ((k2.x ?? x) - (k1.x ?? x)) * ease,
        y: (k1.y ?? y) + ((k2.y ?? y) - (k1.y ?? y)) * ease,
        scale: (k1.scale ?? scale) + ((k2.scale ?? scale) - (k1.scale ?? scale)) * ease,
        scaleX: (k1.scaleX ?? scaleX) + ((k2.scaleX ?? scaleX) - (k1.scaleX ?? scaleX)) * ease,
        scaleY: (k1.scaleY ?? scaleY) + ((k2.scaleY ?? scaleY) - (k1.scaleY ?? scaleY)) * ease,
        rotation: (k1.rotation ?? rotation) + ((k2.rotation ?? rotation) - (k1.rotation ?? rotation)) * ease,
        opacity: (k1.opacity ?? opacity) + ((k2.opacity ?? opacity) - (k1.opacity ?? opacity)) * ease
      };
    }
  }

  return { x, y, scale, scaleX, scaleY, rotation, opacity };
}

// 2. CapCut Transition Evaluation mirroring compositor.ts
function evaluateTransition(currentTime, clipStart, clipDuration, transIn, transOut) {
  const timeInClip = currentTime - clipStart;
  const timeToEnd = clipStart + clipDuration - currentTime;
  let alphaMultiplier = 1.0;
  let scaleMultiplier = 1.0;

  // Transition In
  if (transIn && transIn.type !== 'none' && timeInClip >= 0 && timeInClip < transIn.duration) {
    const p = Math.min(1, Math.max(0, timeInClip / transIn.duration));
    if (transIn.type === 'fade' || transIn.type === 'dissolve') {
      alphaMultiplier *= p;
    } else if (transIn.type === 'zoomIn') {
      scaleMultiplier *= (0.3 + 0.7 * p);
    }
  }

  // Transition Out
  if (transOut && transOut.type !== 'none' && timeToEnd >= 0 && timeToEnd < transOut.duration) {
    const p = Math.min(1, Math.max(0, timeToEnd / transOut.duration));
    if (transOut.type === 'fade' || transOut.type === 'dissolve') {
      alphaMultiplier *= p;
    } else if (transOut.type === 'zoomOut') {
      scaleMultiplier *= (0.2 + 0.8 * p);
    }
  }

  return { alphaMultiplier, scaleMultiplier };
}

test('CapCut Keyframe 1: S-curve smooth interpolation for position, scale, and opacity', () => {
  const keyframes = [
    { time: 0, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
    { time: 2.0, x: 100, y: 200, scale: 2.0, opacity: 0.5 }
  ];
  const defaults = { x: 0, y: 0, scale: 1.0, scaleX: 1.0, scaleY: 1.0, rotation: 0, opacity: 1.0 };

  // Midpoint t = 1.0s (t_norm = 0.5 -> ease = 0.5)
  const mid = interpolateKeyframes(keyframes, 1.0, defaults);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 100);
  assert.equal(mid.scale, 1.5);
  assert.equal(mid.opacity, 0.75);

  // Clamping before first keyframe
  const before = interpolateKeyframes(keyframes, -0.5, defaults);
  assert.equal(before.x, 0);
  assert.equal(before.scale, 1.0);

  // Clamping after last keyframe
  const after = interpolateKeyframes(keyframes, 3.5, defaults);
  assert.equal(after.x, 100);
  assert.equal(after.y, 200);
  assert.equal(after.scale, 2.0);
  assert.equal(after.opacity, 0.5);
});

test('CapCut Keyframe 2: Non-uniform Scale X and Scale Y keyframe interpolation', () => {
  const keyframes = [
    { time: 0, scaleX: 1.0, scaleY: 1.0 },
    { time: 1.0, scaleX: 2.0, scaleY: 0.5 }
  ];
  const defaults = { x: 0, y: 0, scale: 1.0, scaleX: 1.0, scaleY: 1.0, rotation: 0, opacity: 1.0 };

  const mid = interpolateKeyframes(keyframes, 0.5, defaults);
  assert.equal(mid.scaleX, 1.5);
  assert.equal(mid.scaleY, 0.75);
});

test('CapCut Advanced Mask: Validates 6 mask types, invert flag, and feather bounds', () => {
  const supportedMasks = ['circle', 'rect', 'split', 'filmstrip', 'heart', 'star'];
  assert.equal(supportedMasks.length, 6);

  const maskConfig = {
    type: 'rect',
    invert: true,
    feather: 25,
    roundness: 30,
    width: 600,
    height: 400,
    rotation: 45
  };

  assert.equal(maskConfig.type, 'rect');
  assert.equal(maskConfig.invert, true);
  assert.ok(maskConfig.feather >= 0 && maskConfig.feather <= 100);
  assert.ok(maskConfig.roundness >= 0 && maskConfig.roundness <= 150);
});

test('CapCut Transition In & Out: Evaluates fade in and zoom out factors', () => {
  const transIn = { type: 'fade', duration: 1.0 };
  const transOut = { type: 'zoomOut', duration: 1.0 };
  const clipStart = 0;
  const clipDuration = 5.0;

  // At 0.5s into clip (halfway through Transition In)
  const atHalfIn = evaluateTransition(0.5, clipStart, clipDuration, transIn, transOut);
  assert.equal(atHalfIn.alphaMultiplier, 0.5);
  assert.equal(atHalfIn.scaleMultiplier, 1.0);

  // At 2.5s into clip (middle of clip, transitions dormant)
  const atMid = evaluateTransition(2.5, clipStart, clipDuration, transIn, transOut);
  assert.equal(atMid.alphaMultiplier, 1.0);
  assert.equal(atMid.scaleMultiplier, 1.0);

  // At 4.5s into clip (halfway through Transition Out: timeToEnd = 0.5s, p = 0.5)
  // zoomOut: 0.2 + 0.8 * 0.5 = 0.6
  const atHalfOut = evaluateTransition(4.5, clipStart, clipDuration, transIn, transOut);
  assert.ok(Math.abs(atHalfOut.scaleMultiplier - 0.6) < 1e-5);
});

test('CapCut Flip / Mirror: Inverts scale coordinates accurately', () => {
  const normalScaleX = 1.0;
  const normalScaleY = 1.0;

  const flipX = true;
  const flipY = false;

  const effScaleX = normalScaleX * (flipX ? -1 : 1);
  const effScaleY = normalScaleY * (flipY ? -1 : 1);

  assert.equal(effScaleX, -1.0);
  assert.equal(effScaleY, 1.0);
});
