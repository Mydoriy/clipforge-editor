/* ==========================================================================
   CLIPFORGE - DETERMINISTIC FRAME RENDERER & MEDIA COMPOSITOR
   ========================================================================== */
const loadedImages = new Map();
const loadedVideos = new Map();
const precompCanvasCache = document.createElement("canvas");

function getInterpolatedKeyframe(keyframes, clipRelTime, defaultValue) {
  if (!keyframes || keyframes.length === 0) return defaultValue;
  if (keyframes.length === 1) return keyframes[0].value;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (clipRelTime <= sorted[0].time) return sorted[0].value;
  if (clipRelTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const kfA = sorted[i];
    const kfB = sorted[i + 1];
    if (clipRelTime >= kfA.time && clipRelTime <= kfB.time) {
      const duration = kfB.time - kfA.time;
      let t = (clipRelTime - kfA.time) / (duration || 0.001);

      if (kfA.bezier && kfA.bezier.length === 4) {
        t = solveCubicBezier(t, kfA.bezier[0], kfA.bezier[1], kfA.bezier[2], kfA.bezier[3]);
      } else if (kfA.easing === "bounce") {
        t = bounceEasing(t);
      } else if (kfA.easing === "overshoot" || kfA.easing === "back-overshoot") {
        t = solveCubicBezier(t, 0.34, 1.56, 0.64, 1.0);
      } else if (kfA.easing === "ease") {
        t = solveCubicBezier(t, 0.25, 0.1, 0.25, 1.0);
      } else if (kfA.easing === "easeIn") {
        t = t * t;
      } else if (kfA.easing === "easeOut") {
        t = t * (2 - t);
      } else if (kfA.easing === "easeInOut") {
        t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }
      return kfA.value + (kfB.value - kfA.value) * t;
    }
  }
  return defaultValue;
}

function getTrackedPosition(clip, relTime) {
  if (!clip.tracking || !clip.tracking.enabled || !clip.tracking.points || clip.tracking.points.length === 0) {
    return { x: 0, y: 0 };
  }
  const pts = [...clip.tracking.points].sort((a, b) => a.time - b.time);
  if (relTime <= pts[0].time) return { x: pts[0].x, y: pts[0].y };
  if (relTime >= pts[pts.length - 1].time) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };

  for (let i = 0; i < pts.length - 1; i++) {
    if (relTime >= pts[i].time && relTime <= pts[i + 1].time) {
      const t = (relTime - pts[i].time) / (pts[i + 1].time - pts[i].time);
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t
      };
    }
  }
  return { x: 0, y: 0 };
}

function renderMediaWithTransform(ctx, source, clip, scaleVal, rotVal, canvasW, canvasH) {
  const sw = source.videoWidth || source.naturalWidth || source.width || 1280;
  const sh = source.videoHeight || source.naturalHeight || source.height || 720;
  const fitMode = clip.transform.fit || "blur_fill";

  if (fitMode === "crop_pan") {
    ctx.save();
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate((rotVal * Math.PI) / 180);
    ctx.scale(scaleVal, scaleVal);

    const panX = getInterpolatedKeyframe(clip.keyframes?.cropX, (clip._relTime || 0), clip.transform.cropX ?? 0.5);
    const targetAspect = canvasW / canvasH;
    const cropW = Math.min(sw, sh * targetAspect);
    const cropH = sh;
    const maxOffset = sw - cropW;
    const sourceX = Math.max(0, Math.min(maxOffset, panX * maxOffset));

    ctx.drawImage(source, sourceX, 0, cropW, cropH, -canvasW * 0.5, -canvasH * 0.5, canvasW, canvasH);
    ctx.restore();
    return;
  }

  if (fitMode === "blur_fill") {
    ctx.save();
    ctx.filter = "blur(32px) brightness(0.65)";
    const bgScale = Math.max(canvasW / sw, canvasH / sh) * 1.1;
    const bgW = sw * bgScale;
    const bgH = sh * bgScale;
    ctx.drawImage(source, (canvasW - bgW) / 2, (canvasH - bgH) / 2, bgW, bgH);
    ctx.restore();

    ctx.save();
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate((rotVal * Math.PI) / 180);
    ctx.scale(scaleVal, scaleVal);

    const fgScale = Math.min(canvasW / sw, (canvasH * 0.75) / sh);
    const fgW = sw * fgScale;
    const fgH = sh * fgScale;
    ctx.drawImage(source, -fgW / 2, -fgH / 2, fgW, fgH);
    ctx.restore();
  } else if (fitMode === "cover") {
    ctx.save();
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate((rotVal * Math.PI) / 180);
    ctx.scale(scaleVal, scaleVal);

    const coverScale = Math.max(canvasW / sw, canvasH / sh);
    const cW = sw * coverScale;
    const cH = sh * coverScale;
    ctx.drawImage(source, -cW / 2, -cH / 2, cW, cH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate((rotVal * Math.PI) / 180);
    ctx.scale(scaleVal, scaleVal);

    const fitScale = Math.min(canvasW / sw, canvasH / sh);
    const fW = sw * fitScale;
    const fH = sh * fitScale;
    ctx.drawImage(source, -fW / 2, -fH / 2, fW, fH);
    ctx.restore();
  }
}

function renderTextClip(ctx, clip, relTime, scaleVal, rotVal, canvasW, canvasH) {
  const txt = clip.text;
  if (!txt || !txt.content) return;

  const style = clip.captionStyle || txt.style || "standard";
  let content = txt.content;
  let animScale = 1.0;
  let animOffsetY = 0.0;
  let animAlpha = 1.0;

  const animDuration = 0.4;
  if (relTime < animDuration) {
    const p = relTime / animDuration;
    if (txt.animIn === "pop" || style === "pop_in") {
      animScale = Math.sin(p * Math.PI * 0.5) * 1.25;
      if (p > 0.8) animScale = 1.0 + (1.0 - p);
    } else if (txt.animIn === "bounce") {
      animOffsetY = -Math.abs(Math.sin(p * Math.PI * 2.5)) * 60 * (1 - p);
    } else if (txt.animIn === "slide") {
      animOffsetY = (1 - p) * 120;
      animAlpha = p;
    } else if (txt.animIn === "typewriter" || style === "typewriter") {
      const charCount = Math.floor(content.length * (relTime / (animDuration * 2.0)));
      content = content.substring(0, Math.min(content.length, Math.max(1, charCount)));
      if (relTime < animDuration * 2.0) content += (Math.floor(relTime * 8) % 2 === 0 ? " |" : "");
    }
  }

  ctx.save();
  ctx.translate(clip.transform.x, clip.transform.y + animOffsetY);
  ctx.rotate((rotVal * Math.PI) / 180);
  ctx.scale(scaleVal * animScale, scaleVal * animScale);
  ctx.globalAlpha *= animAlpha;

  ctx.font = `bold ${txt.size}px '${txt.font}', sans-serif`;
  ctx.textAlign = txt.align || "center";
  ctx.textBaseline = "middle";

  if (clip.textAnimator && clip.textAnimator.enabled) {
    const anim = clip.textAnimator;
    const unit = anim.unit || "char";
    const stagger = anim.stagger || 0.06;
    const animType = anim.animType || "fade_rise";
    const tokens = unit === "word" ? content.split(" ") : content.split("");

    let curX = -ctx.measureText(content).width * 0.5;
    tokens.forEach((tk, idx) => {
      const itemTime = relTime - idx * stagger;
      const p = Math.max(0, Math.min(1, itemTime / 0.35));
      const w = ctx.measureText(tk + (unit === "word" ? " " : "")).width;

      ctx.save();
      let dy = 0, itemScale = 1.0, itemRot = 0, itemAlpha = 1.0;
      if (animType === "fade_rise") {
        dy = (1.0 - p) * 40;
        itemAlpha = p;
      } else if (animType === "scale_bounce") {
        itemScale = p < 0.7 ? (p / 0.7) * 1.35 : 1.35 - ((p - 0.7) / 0.3) * 0.35;
      } else if (animType === "wave") {
        dy = Math.sin((relTime * 6) + idx * 0.5) * 18;
      } else if (animType === "spin") {
        itemRot = (1.0 - p) * Math.PI * 0.5;
        itemAlpha = p;
      }

      ctx.translate(curX + w * 0.5, dy);
      ctx.rotate(itemRot);
      ctx.scale(itemScale, itemScale);
      ctx.globalAlpha *= itemAlpha;
      ctx.fillText(tk, 0, 0);
      ctx.restore();
      curX += w;
    });
    ctx.restore();
    return;
  }

  if (style === "pill") {
    const m = ctx.measureText(content);
    const pw = m.width + 36;
    const ph = txt.size * 1.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(-pw * 0.5, -ph * 0.5, pw, ph, ph * 0.5);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.fillText(content, 0, 0);
    ctx.restore();
    return;
  }

  if (style === "dark_box" || (txt.bg && txt.bg !== "transparent")) {
    const m = ctx.measureText(content);
    const bw = m.width + 32;
    const bh = txt.size * 1.5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 8);
    ctx.fill();
  }

  if (style === "neon") {
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 6;
    ctx.strokeText(content, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(content, 0, 0);
    ctx.restore();
    return;
  }

  if (style === "karaoke" && clip.tokens && clip.tokens.length > 0) {
    let totalW = 0;
    const measured = clip.tokens.map(tk => {
      const w = ctx.measureText(tk.word + " ").width;
      totalW += w;
      return { ...tk, width: w };
    });

    let curX = -totalW * 0.5;
    const curAbsTime = clip.start + relTime;

    measured.forEach(tk => {
      const isActive = curAbsTime >= tk.start && curAbsTime < tk.end;
      ctx.save();
      if (isActive) {
        ctx.fillStyle = "#ffeb3b";
        ctx.shadowColor = "#ff3b5c";
        ctx.shadowBlur = 14;
        ctx.font = `900 ${txt.size * 1.2}px '${txt.font}', sans-serif`;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.strokeText(tk.word, curX + tk.width * 0.5, -4);
        ctx.fillText(tk.word, curX + tk.width * 0.5, -4);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.strokeText(tk.word, curX + tk.width * 0.5, 0);
        ctx.fillText(tk.word, curX + tk.width * 0.5, 0);
      }
      ctx.restore();
      curX += tk.width;
    });
    ctx.restore();
    return;
  }

  const lines = content.split("\n");
  const lineHeight = txt.size * 1.25;
  const totalH = lines.length * lineHeight;

  lines.forEach((line, idx) => {
    const lineY = -totalH * 0.5 + (idx + 0.5) * lineHeight;
    if (txt.shadow) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 4;
    }
    if (txt.stroke && txt.strokeWidth > 0) {
      ctx.strokeStyle = txt.stroke;
      ctx.lineWidth = txt.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(line, 0, lineY);
    }
    ctx.fillStyle = txt.color || "#ffffff";
    ctx.fillText(line, 0, lineY);
  });

  ctx.restore();
}

function renderStickerClip(ctx, clip, relTime, W, H) {
  const stickerType = clip.stickerType || "hot";
  ctx.save();
  ctx.translate(clip.transform.x, clip.transform.y);
  ctx.rotate((clip.transform.rotation * Math.PI) / 180);

  const pulse = 1.0 + Math.sin(relTime * 6) * 0.08;
  ctx.scale(clip.transform.scale * pulse, clip.transform.scale * pulse);

  const s = 90;
  if (stickerType === "hot") {
    ctx.fillStyle = "#ff3b5c";
    ctx.shadowColor = "#ffeb3b";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-s * 0.5, -s * 0.3, s, s * 0.6, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px Anton, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥 HOT", 0, 0);
  } else if (stickerType === "new") {
    ctx.fillStyle = "#06b6d4";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(-s * 0.5, -s * 0.3, s, s * 0.6, 10);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "900 26px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEW ⚡", 0, 0);
  } else if (stickerType === "follow") {
    ctx.fillStyle = "#ff3b5c";
    ctx.beginPath();
    ctx.roundRect(-s * 0.7, -s * 0.25, s * 1.4, s * 0.5, s * 0.25);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 18px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+ FOLLOW", 0, 0);
  } else if (stickerType === "arrow") {
    const bounce = Math.sin(relTime * 8) * 15;
    ctx.translate(0, bounce);
    ctx.fillStyle = "#ffeb3b";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.lineTo(-s * 0.35, -s * 0.2);
    ctx.lineTo(-s * 0.15, -s * 0.2);
    ctx.lineTo(-s * 0.15, -s * 0.4);
    ctx.lineTo(s * 0.15, -s * 0.4);
    ctx.lineTo(s * 0.15, -s * 0.2);
    ctx.lineTo(s * 0.35, -s * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (stickerType === "warning") {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.45);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "900 32px Anton, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, s * 0.05);
  } else if (stickerType === "top") {
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("100%", 0, 0);
  }
  ctx.restore();
}

function renderPrecompClip(ctx, clip, relTime, W, H, proj) {
  if (!clip.subClips || clip.subClips.length === 0) return;
  if (precompCanvasCache.width !== W || precompCanvasCache.height !== H) {
    precompCanvasCache.width = W;
    precompCanvasCache.height = H;
  }
  const offCtx = precompCanvasCache.getContext("2d");
  offCtx.clearRect(0, 0, W, H);

  const subProj = { ...proj, clips: clip.subClips, safeZone: { enabled: false } };
  renderFrame(subProj, relTime, precompCanvasCache, { isExport: true });

  ctx.save();
  ctx.translate(clip.transform.x, clip.transform.y);
  ctx.rotate((clip.transform.rotation * Math.PI) / 180);
  ctx.scale(clip.transform.scale, clip.transform.scale);
  ctx.drawImage(precompCanvasCache, -W * 0.5, -H * 0.5, W, H);
  ctx.restore();
}

function drawSafeZoneGuides(ctx, sz, W, H) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 59, 92, 0.6)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  const rx = sz.left;
  const ry = sz.top;
  const rw = W - sz.left - sz.right;
  const rh = H - sz.top - sz.bottom;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, W, ry);
  ctx.fillRect(0, H - sz.bottom, W, sz.bottom);
  ctx.fillRect(0, ry, rx, rh);
  ctx.fillRect(W - sz.right, ry, sz.right, rh);
  ctx.restore();
}

function renderFrame(proj, time, targetCanvas, options = {}) {
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  const W = targetCanvas.width;
  const H = targetCanvas.height;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  const trackOrder = ["track-main", "track-overlay", "track-text", "track-adjustment"];
  
  trackOrder.forEach(trackId => {
    const activeClips = proj.clips.filter(c => 
      c.trackId === trackId && time >= c.start && time < (c.start + c.duration)
    );

    activeClips.forEach(clip => {
      const clipRelTime = time - clip.start;
      const sourceTimeOffset = getRampedSourceTime(clip, clipRelTime);
      const clipTime = sourceTimeOffset + clip.inPoint;

      const scaleKf = getInterpolatedKeyframe(clip.keyframes?.scale, clipRelTime, clip.transform.scale || 1.0);
      const rotKf = getInterpolatedKeyframe(clip.keyframes?.rotation, clipRelTime, clip.transform.rotation || 0);
      const opacKf = getInterpolatedKeyframe(clip.keyframes?.opacity, clipRelTime, clip.transform.opacity ?? 1.0);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, opacKf));

      if (clip.blendMode && clip.blendMode !== "normal") {
        ctx.globalCompositeOperation = clip.blendMode;
      }

      if (clip.mask && clip.mask.type && clip.mask.type !== "none") {
        ctx.beginPath();
        const mx = (clip.mask.x ?? 0.5) * W;
        const my = (clip.mask.y ?? 0.5) * H;
        const mw = (clip.mask.width ?? 0.8) * W * 0.5;
        const mh = (clip.mask.height ?? 0.8) * H * 0.5;
        if (clip.mask.type === "rect") {
          ctx.rect(mx - mw, my - mh, mw * 2, mh * 2);
        } else if (clip.mask.type === "ellipse") {
          ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2);
        }
        ctx.clip();
      }

      if (clip.transitionIn && clip.transitionIn.type !== "none" && clipRelTime < clip.transitionIn.duration) {
        const transProg = clipRelTime / clip.transitionIn.duration;
        applyTransition(ctx, clip.transitionIn.type, transProg, W, H);
      }

      if (clip.tracking && clip.tracking.enabled) {
        const trPos = getTrackedPosition(clip, clipRelTime);
        ctx.translate(trPos.x, trPos.y);
      }

      if (clip.type === "adjustment") {
      } else if (clip.type === "particle") {
        renderParticleSystem(ctx, clip, clipRelTime, W, H);
      } else if (clip.type === "shape") {
        renderShapeClip(ctx, clip, clipRelTime, W, H);
      } else if (clip.type === "sticker") {
        renderStickerClip(ctx, clip, clipRelTime, W, H);
      } else if (clip.type === "precomp") {
        renderPrecompClip(ctx, clip, clipRelTime, W, H, proj);
      } else if (clip.type === "video" || clip.type === "image") {
        const asset = proj.assets.find(a => a.id === clip.assetId);
        let mediaSource = null;
        if (clip.type === "image") mediaSource = loadedImages.get(clip.assetId);
        else if (clip.type === "video") {
          const vid = loadedVideos.get(clip.assetId);
          if (vid) {
            if (Math.abs(vid.currentTime - clipTime) > 0.08) {
              vid.currentTime = clipTime;
            }
            mediaSource = vid;
          }
        }

        if (mediaSource) {
          clip._relTime = clipRelTime;
          renderMediaWithTransform(ctx, mediaSource, clip, scaleKf, rotKf, W, H);
        }
      } else if (clip.type === "text") {
        renderTextClip(ctx, clip, clipRelTime, scaleKf, rotKf, W, H);
      }

      if (clip.chromaKey && clip.chromaKey.enabled) {
        applyChromaKey(ctx, clip.chromaKey, W, H);
      }

      if (clip.colorGrading) {
        applyColorGrading(ctx, clip.colorGrading, W, H);
      }

      if (clip.effects && clip.effects.length > 0) {
        clip.effects.forEach(fx => {
          applyProceduralEffect(ctx, fx, clipRelTime, W, H);
        });
      }

      if (proj.beatPulseEffect && proj.beatMarkers && proj.beatMarkers.length > 0) {
        let minDiff = 999;
        for (const b of proj.beatMarkers) {
          const diff = Math.abs(time - b);
          if (diff < minDiff) minDiff = diff;
        }
        if (minDiff < 0.16) {
          const pulse = (1.0 - minDiff / 0.16) * ((proj.beatPulseEffect.intensity || 75) / 100);
          applyProceduralEffect(ctx, { type: proj.beatPulseEffect.type || "flash", intensity: Math.round(pulse * 100) }, clipRelTime, W, H);
        }
      }

      ctx.restore();
    });
  });

  if (!options.isExport && proj.safeZone && proj.safeZone.enabled) {
    drawSafeZoneGuides(ctx, proj.safeZone, W, H);
  }
}
