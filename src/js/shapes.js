/* ==========================================================================
   CLIPFORGE - SHAPE LAYER & TRIM PATH ENGINE
   ========================================================================== */
function renderShapeClip(ctx, clip, relTime, W, H) {
  const shp = clip.shape || { type: "rect", fill: "#ff3b5c", stroke: "#ffffff", strokeWidth: 4, trimStart: 0, trimEnd: 100, trimOffset: 0 };
  const shapeType = shp.type || "rect";
  const fillCol = shp.fill || "#ff3b5c";
  const strokeCol = shp.stroke || "#ffffff";
  const strokeW = shp.strokeWidth || 4;
  const trimStart = (shp.trimStart || 0) / 100;
  const trimEnd = (shp.trimEnd ?? 100) / 100;
  const trimOffset = (shp.trimOffset || 0) / 360;

  ctx.save();
  ctx.translate(clip.transform.x, clip.transform.y);
  ctx.rotate((clip.transform.rotation * Math.PI) / 180);
  ctx.scale(clip.transform.scale, clip.transform.scale);

  const size = 160;
  ctx.beginPath();

  if (shapeType === "rect") {
    ctx.rect(-size * 0.5, -size * 0.5, size, size);
  } else if (shapeType === "rounded_rect") {
    ctx.roundRect(-size * 0.5, -size * 0.5, size, size, 24);
  } else if (shapeType === "circle") {
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  } else if (shapeType === "star") {
    const outerR = size * 0.5;
    const innerR = size * 0.22;
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 72 - 18) * (Math.PI / 180);
      const a2 = ((i + 0.5) * 72 - 18) * (Math.PI / 180);
      if (i === 0) ctx.moveTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      else ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
    }
    ctx.closePath();
  } else if (shapeType === "arrow") {
    ctx.moveTo(-size * 0.4, -size * 0.15);
    ctx.lineTo(size * 0.1, -size * 0.15);
    ctx.lineTo(size * 0.1, -size * 0.35);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(size * 0.1, size * 0.35);
    ctx.lineTo(size * 0.1, size * 0.15);
    ctx.lineTo(-size * 0.4, size * 0.15);
    ctx.closePath();
  } else if (shapeType === "line") {
    ctx.moveTo(-size * 0.5, 0);
    ctx.lineTo(size * 0.5, 0);
  }

  if (fillCol && fillCol !== "transparent") {
    ctx.fillStyle = fillCol;
    ctx.fill();
  }

  if (strokeCol && strokeW > 0) {
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = "round";

    const approxPerimeter = size * 4;
    const visibleLen = Math.max(0, (trimEnd - trimStart) * approxPerimeter);
    ctx.setLineDash([visibleLen, approxPerimeter]);
    ctx.lineDashOffset = -((trimStart + trimOffset) * approxPerimeter);
    ctx.stroke();
  }

  ctx.restore();
}
