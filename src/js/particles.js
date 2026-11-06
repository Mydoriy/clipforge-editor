/* ==========================================================================
   CLIPFORGE - PROCEDURAL PARTICLE SYSTEM (CONFETTI, SPARKLES, HEARTS)
   ========================================================================== */
function renderParticleSystem(ctx, clip, relTime, W, H) {
  const preset = clip.particlePreset || "confetti";
  const count = clip.particleCount || 75;
  const speed = clip.particleSpeed || 1.0;
  const baseSize = clip.particleSize || 16;
  const t = relTime * speed;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const seedX = Math.sin(i * 12.9898) * 43758.5453;
    const seedY = Math.cos(i * 78.233) * 43758.5453;
    const x0 = (seedX - Math.floor(seedX)) * W;
    const y0 = (seedY - Math.floor(seedY)) * H;
    const colIdx = Math.floor(Math.abs(Math.sin(i * 3.7)) * 5);
    const colors = ["#ff3b5c", "#ffeb3b", "#06b6d4", "#10b981", "#a855f7"];

    if (preset === "confetti") {
      const y = (y0 + t * 240 + Math.sin(t * 3 + i) * 30) % H;
      const x = (x0 + Math.sin(t * 4 + i * 2) * 40) % W;
      const rot = t * 6 + i * 1.5;
      const scaleY = Math.cos(t * 8 + i);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, scaleY);
      ctx.fillStyle = colors[colIdx];
      ctx.fillRect(-baseSize * 0.5, -baseSize * 0.25, baseSize, baseSize * 0.5);
      ctx.restore();
    } else if (preset === "sparkles") {
      const y = (H + y0 - (t * 80) % H) % H;
      const x = (x0 + Math.cos(t * 2 + i) * 20) % W;
      const twinkle = Math.max(0.2, Math.abs(Math.sin(t * 6 + i * 1.7)));
      const sz = baseSize * twinkle;

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = colors[colIdx];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.3, -sz * 0.3);
      ctx.lineTo(sz, 0);
      ctx.lineTo(sz * 0.3, sz * 0.3);
      ctx.lineTo(0, sz);
      ctx.lineTo(-sz * 0.3, sz * 0.3);
      ctx.lineTo(-sz, 0);
      ctx.lineTo(-sz * 0.3, -sz * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (preset === "hearts") {
      const y = (H + y0 - (t * 120) % H) % H;
      const x = (x0 + Math.sin(t * 3 + i) * 35) % W;
      const pulse = baseSize * (0.8 + 0.3 * Math.sin(t * 5 + i));

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = colors[colIdx % 2 === 0 ? 0 : 4];
      ctx.shadowColor = "rgba(255, 59, 92, 0.6)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const d = pulse * 0.5;
      ctx.moveTo(0, d * 0.6);
      ctx.bezierCurveTo(-d, -d * 0.5, -d * 1.5, d * 0.3, 0, d * 1.4);
      ctx.bezierCurveTo(d * 1.5, d * 0.3, d, -d * 0.5, 0, d * 0.6);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
