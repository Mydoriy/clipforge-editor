import React, { useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text as KonvaText } from 'react-konva';
import { Header } from '../components/Header';
import { useEditorStore } from '../store/useEditorStore';
import {
  Type,
  Square,
  Circle as CircleIcon,
  Download,
  Palette,
  Undo2,
  Smile,
  Trash2
} from 'lucide-react';

interface CanvasItem {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'sticker';
  x: number;
  y: number;
  fill: string;
  text?: string;
  width?: number;
  height?: number;
  radius?: number;
  fontSize?: number;
}

export const DesignStudio: React.FC = () => {
  const { showToast } = useEditorStore();
  const stageRef = useRef<any>(null);

  const [bgColor, setBgColor] = useState('#0f172a');
  const [items, setItems] = useState<CanvasItem[]>([
    {
      id: 'item-1',
      type: 'text',
      x: 40,
      y: 120,
      text: 'VIRAL POSTER',
      fill: '#facc15',
      fontSize: 32
    },
    {
      id: 'item-2',
      type: 'rect',
      x: 40,
      y: 200,
      width: 280,
      height: 240,
      fill: '#1e293b'
    },
    {
      id: 'item-3',
      type: 'sticker',
      x: 150,
      y: 300,
      text: '🚀',
      fill: '#ffffff',
      fontSize: 54
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleExportImage = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = uri;
      a.download = `ClipForge_Poster_916_${Date.now()}.png`;
      a.click();
      showToast('Đã xuất ảnh Poster 9:16 (PNG)!', 'success');
    }
  };

  const handleAddItem = (type: 'text' | 'rect' | 'circle' | 'sticker', extra?: string) => {
    const id = 'item-' + Date.now();
    let newItem: CanvasItem;

    if (type === 'text') {
      newItem = { id, type: 'text', x: 80, y: 150, text: 'TIÊU ĐỀ MỚI', fill: '#00f2fe', fontSize: 28 };
    } else if (type === 'rect') {
      newItem = { id, type: 'rect', x: 80, y: 220, width: 200, height: 120, fill: '#334155' };
    } else if (type === 'circle') {
      newItem = { id, type: 'circle', x: 180, y: 300, radius: 50, fill: '#ec4899' };
    } else {
      newItem = { id, type: 'sticker', x: 160, y: 250, text: extra || '🔥', fill: '#ffffff', fontSize: 48 };
    }

    setItems([...items, newItem]);
    setSelectedId(id);
    showToast(`Đã thêm ${type} vào Canvas`);
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      setItems(items.filter((i) => i.id !== selectedId));
      setSelectedId(null);
      showToast('Đã xóa đối tượng');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0d14] select-none">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-64 bg-[#11141c] border-r border-slate-800 p-4 flex flex-col gap-4 text-xs text-slate-300">
          <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-purple-400" />
            Design Studio (Konva 2D)
          </span>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Thêm đối tượng:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddItem('text')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-2 font-medium"
              >
                <Type className="w-4 h-4 text-cyan-400" />
                <span>Văn bản</span>
              </button>

              <button
                onClick={() => handleAddItem('rect')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-2 font-medium"
              >
                <Square className="w-4 h-4 text-amber-400" />
                <span>Hình chữ nhật</span>
              </button>

              <button
                onClick={() => handleAddItem('circle')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-2 font-medium"
              >
                <CircleIcon className="w-4 h-4 text-pink-400" />
                <span>Hình tròn</span>
              </button>

              <button
                onClick={() => handleAddItem('sticker', '💎')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center gap-2 font-medium"
              >
                <Smile className="w-4 h-4 text-emerald-400" />
                <span>Sticker</span>
              </button>
            </div>
          </div>

          {/* Color palette */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold">Màu nền Poster:</span>
            <div className="grid grid-cols-5 gap-2">
              {['#0f172a', '#1e1b4b', '#18181b', '#3b0764', '#064e3b'].map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-8 rounded-lg border-2 transition-all ${
                    bgColor === color ? 'border-cyan-400 scale-110' : 'border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Delete item */}
          {selectedId && (
            <button
              onClick={handleDeleteSelected}
              className="mt-auto py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-600/50 text-rose-300 font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa đối tượng đang chọn</span>
            </button>
          )}

          {/* Export PNG */}
          <button
            onClick={handleExportImage}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Xuất Poster 9:16 (PNG)</span>
          </button>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-[#07090e] p-6 flex items-center justify-center overflow-auto">
          <div className="relative aspect-[9/16] h-[640px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
            <Stage
              ref={stageRef}
              width={360}
              height={640}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {/* Background Rect */}
                <Rect x={0} y={0} width={360} height={640} fill={bgColor} />

                {items.map((item) => {
                  if (item.type === 'rect') {
                    return (
                      <Rect
                        key={item.id}
                        x={item.x}
                        y={item.y}
                        width={item.width}
                        height={item.height}
                        fill={item.fill}
                        draggable
                        stroke={selectedId === item.id ? '#00f2fe' : undefined}
                        strokeWidth={2}
                        onClick={() => setSelectedId(item.id)}
                        onDragEnd={(e) => {
                          const { x, y } = e.target.position();
                          setItems(items.map((i) => (i.id === item.id ? { ...i, x, y } : i)));
                        }}
                      />
                    );
                  }
                  if (item.type === 'circle') {
                    return (
                      <Circle
                        key={item.id}
                        x={item.x}
                        y={item.y}
                        radius={item.radius}
                        fill={item.fill}
                        draggable
                        stroke={selectedId === item.id ? '#00f2fe' : undefined}
                        strokeWidth={2}
                        onClick={() => setSelectedId(item.id)}
                        onDragEnd={(e) => {
                          const { x, y } = e.target.position();
                          setItems(items.map((i) => (i.id === item.id ? { ...i, x, y } : i)));
                        }}
                      />
                    );
                  }
                  return (
                    <KonvaText
                      key={item.id}
                      x={item.x}
                      y={item.y}
                      text={item.text || ''}
                      fontSize={item.fontSize || 24}
                      fontFamily="sans-serif"
                      fontStyle="bold"
                      fill={item.fill}
                      draggable
                      onClick={() => setSelectedId(item.id)}
                      onDragEnd={(e) => {
                        const { x, y } = e.target.position();
                        setItems(items.map((i) => (i.id === item.id ? { ...i, x, y } : i)));
                      }}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  );
};

