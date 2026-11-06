import React, { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { db } from '../db';

export const PlayerCanvas: React.FC = () => {
  const {
    currentTime,
    setCurrentTime,
    duration,
    isPlaying,
    setIsPlaying,
    safeZoneEnabled,
    clips,
    addClip,
    showToast
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Playback timer loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (isPlaying) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setCurrentTime(Math.min(duration, currentTime + delta));
        if (currentTime + delta >= duration) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
      lastTimestamp = timestamp;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, currentTime, setCurrentTime, setIsPlaying]);

  // Render canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(0.5, '#0e1422');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Active clips at currentTime
    const activeClips = clips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration);

    // Render Video & Image tracks
    const videoClips = activeClips.filter((c) => c.track === 'video' || c.type === 'image');
    for (const vClip of videoClips) {
      ctx.save();

      // Opacity
      ctx.globalAlpha = vClip.opacity ?? 1;

      // Position, Scale & Rotation
      ctx.translate(width / 2 + (vClip.x || 0), height / 2 + (vClip.y || 0));
      if (vClip.rotation) {
        ctx.rotate((vClip.rotation * Math.PI) / 180);
      }
      ctx.scale(vClip.scale || 1, vClip.scale || 1);

      // Filters (CSS filter string)
      const b = 100 + (vClip.brightness || 0);
      const c = 100 + (vClip.contrast || 0);
      const s = 100 + (vClip.saturation || 0);

      let filterCss = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
      if (vClip.filter === 'noir') {
        filterCss += ' grayscale(100%)';
      } else if (vClip.filter === 'vintage') {
        filterCss += ' sepia(60%)';
      } else if (vClip.filter === 'warm') {
        filterCss += ' sepia(25%) saturate(140%)';
      } else if (vClip.filter === 'cinematic') {
        filterCss += ' contrast(115%) saturate(125%)';
      } else if (vClip.filter === 'vhs') {
        filterCss += ' hue-rotate(20deg) contrast(110%)';
      } else if (vClip.filter === 'cyberpunk') {
        filterCss += ' hue-rotate(180deg) saturate(180%)';
      } else if (vClip.filter === 'vivid') {
        filterCss += ' saturate(160%) contrast(110%)';
      }

      ctx.filter = filterCss;

      // Draw image if src exists
      if (vClip.src) {
        let img = imageCache.current.get(vClip.src);
        if (!img) {
          img = new Image();
          img.src = vClip.src;
          imageCache.current.set(vClip.src, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
        } else {
          // Placeholder card
          ctx.fillStyle = '#111827';
          ctx.fillRect(-width / 2 + 30, -height / 2 + 100, width - 60, height - 200);
        }
      } else {
        // Procedural 9:16 Video Canvas Card
        const cardGrad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
        if (vClip.filter === 'cyberpunk') {
          cardGrad.addColorStop(0, '#3b0764');
          cardGrad.addColorStop(1, '#083344');
        } else if (vClip.filter === 'cinematic') {
          cardGrad.addColorStop(0, '#042f2e');
          cardGrad.addColorStop(1, '#0f172a');
        } else if (vClip.filter === 'warm') {
          cardGrad.addColorStop(0, '#451a03');
          cardGrad.addColorStop(1, '#1c1917');
        } else {
          cardGrad.addColorStop(0, '#0f172a');
          cardGrad.addColorStop(1, '#1e1b4b');
        }

        ctx.fillStyle = cardGrad;
        ctx.fillRect(-width / 2 + 30, -height / 2 + 80, width - 60, height - 160);

        // Animated neon circle
        const pulse = Math.sin(currentTime * 4) * 14;
        ctx.beginPath();
        ctx.arc(0, 0, 80 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#22D3EE';
        ctx.stroke();

        ctx.filter = 'none';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(vClip.name, 0, 8);
      }

      ctx.restore();
    }

    // Render Stickers
    const stickerClips = activeClips.filter((c) => c.track === 'sticker');
    for (const sticker of stickerClips) {
      ctx.save();
      ctx.globalAlpha = sticker.opacity ?? 1;
      ctx.translate(width / 2 + (sticker.x || 0), height / 2 + (sticker.y || 0));
      if (sticker.rotation) ctx.rotate((sticker.rotation * Math.PI) / 180);
      ctx.scale(sticker.scale || 1, sticker.scale || 1);
      ctx.font = '64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.text || '🔥', 0, 0);
      ctx.restore();
    }

    // Render Text & Captions with In/Out Animations
    const textClips = activeClips.filter((c) => c.track === 'text');
    for (const tClip of textClips) {
      if (!tClip.text) continue;
      ctx.save();

      const timeInClip = currentTime - tClip.start;
      const timeLeftInClip = tClip.start + tClip.duration - currentTime;

      // In Animation
      let inScale = 1;
      let inYOffset = 0;
      let inAlpha = 1;
      let displayText = tClip.text;

      if (tClip.textAnimIn === 'pop') {
        inScale = Math.min(1, timeInClip * 6);
      } else if (tClip.textAnimIn === 'slideUp') {
        inYOffset = Math.max(0, (0.35 - timeInClip) * 120);
      } else if (tClip.textAnimIn === 'fadeIn') {
        inAlpha = Math.min(1, timeInClip / 0.4);
      } else if (tClip.textAnimIn === 'typewriter') {
        const charCount = Math.floor(timeInClip * 18);
        displayText = tClip.text.slice(0, charCount);
      } else if (tClip.textAnimIn === 'zoomIn') {
        inScale = Math.min(1, 0.4 + timeInClip * 2);
      }

      // Out Animation
      let outAlpha = 1;
      let outYOffset = 0;
      if (tClip.textAnimOut === 'fade' && timeLeftInClip < 0.35) {
        outAlpha = Math.max(0, timeLeftInClip / 0.35);
      } else if (tClip.textAnimOut === 'slideDown' && timeLeftInClip < 0.35) {
        outYOffset = (0.35 - timeLeftInClip) * 80;
      }

      ctx.globalAlpha = (tClip.opacity ?? 1) * inAlpha * outAlpha;
      ctx.translate(
        width / 2 + (tClip.x || 0),
        height / 2 + (tClip.y || -110) + inYOffset + outYOffset
      );
      if (tClip.rotation) ctx.rotate((tClip.rotation * Math.PI) / 180);
      ctx.scale((tClip.scale || 1) * inScale, (tClip.scale || 1) * inScale);

      // Alex Hormozi typography style
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text stroke (Black outline)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, 0, 0);

      // Text Fill (Yellow / Neon)
      ctx.fillStyle = tClip.name.includes('Red') ? '#fda4af' : '#facc15';
      ctx.fillText(displayText, 0, 0);

      ctx.restore();
    }

    // Render Particles
    const particleClip = activeClips.find((c) => c.particleType);
    if (particleClip) {
      ctx.save();
      for (let i = 0; i < 28; i++) {
        const px = (currentTime * 110 + i * 42) % width;
        const py = height - ((currentTime * 190 + i * 58) % height);
        ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#EC4899';
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }, [currentTime, clips]);

  // Drag and drop onto canvas
  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const isVideo = file.type.startsWith('video');

      await db.media.add({
        id: 'media-' + Date.now(),
        name: file.name,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        blob: file,
        size: file.size,
        createdAt: Date.now()
      });

      addClip({
        track: isAudio ? 'audio' : 'video',
        name: file.name,
        start: currentTime,
        duration: isAudio ? 12 : 8,
        type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        src: url
      });

      showToast(`Đã thả file "${file.name}" vào vị trí phát!`, 'success');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleCanvasDrop}
      className={`flex-1 flex flex-col items-center justify-center bg-[#0B0F19] p-4 relative overflow-hidden select-none transition-colors ${
        isDragOver ? 'bg-[#22D3EE]/5' : ''
      }`}
    >
      {/* 9:16 Canvas Wrapper */}
      <div className="relative aspect-[9/16] h-[78%] max-h-[580px] rounded-2xl overflow-hidden shadow-2xl border border-[#1F2937] bg-black flex items-center justify-center">
        <canvas ref={canvasRef} width={540} height={960} className="w-full h-full object-contain" />

        {/* 9:16 Safe Zone Overlay (TikTok/Reels overlay guidelines) */}
        {safeZoneEnabled && (
          <div className="absolute inset-0 pointer-events-none border border-dashed border-[#22D3EE]/50 m-4 rounded-xl flex flex-col justify-between p-3">
            {/* Top Bar Safe Zone */}
            <div className="text-[10px] text-[#22D3EE] font-mono bg-[#0E1320]/80 px-2 py-0.5 rounded-lg w-max border border-[#22D3EE]/30">
              Safe Zone: Header & Search
            </div>

            {/* Right Action Icons simulated zone (TikTok/Reels: Like, Comment, Save, Share) */}
            <div className="self-end flex flex-col gap-2 items-center bg-[#0E1320]/80 p-2 rounded-xl border border-[#1F2937]/80">
              <div className="w-6 h-6 rounded-full bg-rose-500/30 flex items-center justify-center text-[10px] text-rose-300 font-bold">
                ♥
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-700/40 flex items-center justify-center text-[10px] text-slate-300">
                💬
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-700/40 flex items-center justify-center text-[10px] text-slate-300">
                🔖
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-700/40 flex items-center justify-center text-[10px] text-slate-300">
                ↗
              </div>
            </div>

            {/* Bottom Caption & Audio Safe Zone */}
            <div className="text-[10px] text-[#22D3EE] font-mono bg-[#0E1320]/80 px-2 py-0.5 rounded-lg w-max border border-[#22D3EE]/30">
              Safe Zone: Caption, Hashtags & Sound
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div className="mt-3 flex items-center gap-4 bg-[#111827] px-5 py-2.5 rounded-2xl border border-[#1F2937] shadow-xl text-white">
        <button
          onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
          className="p-1.5 hover:text-[#22D3EE] hover:bg-[#1F2937] rounded-xl transition-colors"
          title="Lùi 1s (-1s)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 bg-gradient-to-tr from-[#22D3EE] to-sky-400 hover:from-[#22D3EE] hover:to-sky-300 text-slate-950 rounded-full shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105 active:scale-95"
          title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setCurrentTime(Math.min(duration, currentTime + 1))}
          className="p-1.5 hover:text-[#22D3EE] hover:bg-[#1F2937] rounded-xl transition-colors"
          title="Tiến 1s (+1s)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-[#1F2937] mx-1" />

        <div className="text-xs font-mono font-medium text-[#E5E7EB]">
          <span className="text-[#22D3EE] font-bold">{formatTime(currentTime)}</span>
          <span className="text-[#9CA3AF]"> / </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
