import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Play, Pause, RotateCcw, RotateCw, Maximize2 } from 'lucide-react';

export const PlayerCanvas: React.FC = () => {
  const {
    currentTime,
    setCurrentTime,
    duration,
    isPlaying,
    setIsPlaying,
    safeZoneEnabled,
    clips
  } = useEditorStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback timer loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (isPlaying) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= duration) {
            return 0; // loop
          }
          return next;
        });
      }
      lastTimestamp = timestamp;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, setCurrentTime]);

  // Render canvas frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw gradient background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Filter active clips
    const activeClips = clips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration);

    // Draw video track
    const videoClip = activeClips.find((c) => c.track === 'video');
    if (videoClip) {
      ctx.save();
      // Apply filters if any
      if (videoClip.filter === 'vhs') {
        ctx.fillStyle = 'rgba(20, 20, 35, 0.9)';
      } else if (videoClip.filter === 'cinematic') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      }
      ctx.fillRect(20, 100, width - 40, height - 200);

      // Central pulsing ring
      const pulse = Math.sin(currentTime * 5) * 15;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 70 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00f2fe';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(videoClip.name, width / 2, height / 2 + 6);
      ctx.restore();
    }

    // Draw stickers / shapes
    const stickerClips = activeClips.filter((c) => c.track === 'sticker');
    for (const sticker of stickerClips) {
      ctx.save();
      ctx.translate(width / 2 + (sticker.x || 0), height / 2 + (sticker.y || 0));
      ctx.font = '54px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.text || '✨', 0, 0);
      ctx.restore();
    }

    // Draw text overlays
    const textClips = activeClips.filter((c) => c.track === 'text');
    for (const textClip of textClips) {
      if (!textClip.text) continue;
      ctx.save();
      const clipTime = currentTime - textClip.start;
      const pop = Math.min(1, clipTime * 5); // smooth pop
      ctx.translate(width / 2 + (textClip.x || 0), height / 2 + (textClip.y || -120));
      ctx.scale((textClip.scale || 1) * pop, (textClip.scale || 1) * pop);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillText(textClip.text, 0, 0);
      ctx.restore();
    }

    // Draw particles
    const particleClip = activeClips.find((c) => c.particleType);
    if (particleClip) {
      ctx.save();
      for (let i = 0; i < 24; i++) {
        const px = (currentTime * 100 + i * 40) % width;
        const py = height - ((currentTime * 180 + i * 55) % height);
        ctx.fillStyle = i % 2 === 0 ? '#00f2fe' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }, [currentTime, clips]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#090b0f] p-4 relative overflow-hidden select-none">
      {/* 9:16 Canvas Wrapper */}
      <div className="relative aspect-[9/16] h-[78%] max-h-[580px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          className="w-full h-full object-contain"
        />

        {/* 9:16 Safe Zone Overlay */}
        {safeZoneEnabled && (
          <div className="absolute inset-0 pointer-events-none border border-dashed border-cyan-500/40 m-4 rounded-lg flex flex-col justify-between p-3">
            {/* Top Bar area */}
            <div className="text-[10px] text-cyan-400 font-mono bg-cyan-950/70 px-2 py-0.5 rounded w-max border border-cyan-800/40">
              Safe Zone: Header
            </div>

            {/* Right Action Icons simulated zone (TikTok/Reels) */}
            <div className="self-end flex flex-col gap-2 items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/60">
              <div className="w-5 h-5 rounded-full bg-rose-500/40 flex items-center justify-center text-[9px] text-rose-300 font-bold">♥</div>
              <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-300">💬</div>
              <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-300">🔖</div>
              <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-300">↗</div>
            </div>

            {/* Bottom Caption Area */}
            <div className="text-[10px] text-cyan-400 font-mono bg-cyan-950/70 px-2 py-0.5 rounded w-max border border-cyan-800/40">
              Safe Zone: Caption & Audio
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div className="mt-3 flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-lg text-slate-200">
        <button
          onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
          className="p-1.5 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Lùi 1s (-1s)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2.5 bg-gradient-to-tr from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 rounded-full shadow-md shadow-cyan-500/20 transition-all transform hover:scale-105 active:scale-95"
          title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setCurrentTime(Math.min(duration, currentTime + 1))}
          className="p-1.5 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Tiến 1s (+1s)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

        <div className="text-xs font-mono font-medium text-slate-300">
          <span className="text-cyan-400">{formatTime(currentTime)}</span>
          <span className="text-slate-500"> / </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

