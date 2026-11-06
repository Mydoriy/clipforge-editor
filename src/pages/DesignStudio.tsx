import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage } from 'react-konva';
import { Header } from '../components/Header';
import { useEditorStore } from '../store/useEditorStore';
import { db, type ProjectEntity } from '../db';
import { exportCanvasAsPdf } from '../utils/pdfExport';
import {
  Type,
  Square,
  Circle as CircleIcon,
  Download,
  Palette,
  Undo2,
  Redo2,
  Smile,
  Trash2,
  Image as ImageIcon,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Sliders,
  Film,
  FileText
} from 'lucide-react';

interface CanvasItem {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'sticker' | 'image';
  x: number;
  y: number;
  fill: string;
  text?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
  radius?: number;
  fontSize?: number;
  visible?: boolean;
  imageObj?: HTMLImageElement;
}

export const DesignStudio: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, addClip, currentProjectId, setCurrentProjectId, setProjectTitle } = useEditorStore();
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset formats: 9:16 (Poster/Story), 16:9 (Thumbnail), 1:1 (Square Post)
  const [format, setFormat] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const stageDims = {
    '9:16': { width: 360, height: 640, label: 'Story / Poster (9:16)' },
    '16:9': { width: 640, height: 360, label: 'Thumbnail (16:9)' },
    '1:1': { width: 450, height: 450, label: 'Post Vuông (1:1)' }
  }[format];

  const [bgColor, setBgColor] = useState('#0B0F19');
  const [items, setItems] = useState<CanvasItem[]>([
    {
      id: 'item-1',
      type: 'text',
      x: 40,
      y: 80,
      text: 'CAPCUT DESIGN',
      fill: '#22D3EE',
      fontSize: 28,
      visible: true
    },
    {
      id: 'item-2',
      type: 'rect',
      x: 40,
      y: 150,
      width: 280,
      height: 200,
      fill: '#111827',
      visible: true
    },
    {
      id: 'item-3',
      type: 'sticker',
      x: 150,
      y: 220,
      text: '🚀',
      fill: '#ffffff',
      fontSize: 52,
      visible: true
    },
    {
      id: 'item-4',
      type: 'text',
      x: 60,
      y: 400,
      text: '9:16 Vertical Poster Studio',
      fill: '#E5E7EB',
      fontSize: 16,
      visible: true
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>('item-1');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'pdf'>('png');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<CanvasItem[][]>([items]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushState = (newItems: CanvasItem[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newItems);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setItems(newItems);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setItems(history[prev]);
      showToast('Đã hoàn tác (Undo)');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setItems(history[next]);
      showToast('Đã làm lại (Redo)');
    }
  };

  // Add Item
  const handleAddItem = (type: 'text' | 'rect' | 'circle' | 'sticker', extra?: string) => {
    const id = 'item-' + Date.now();
    let newItem: CanvasItem;

    if (type === 'text') {
      newItem = { id, type: 'text', x: 50, y: 180, text: 'TIÊU ĐỀ MỚI', fill: '#EC4899', fontSize: 26, visible: true };
    } else if (type === 'rect') {
      newItem = { id, type: 'rect', x: 60, y: 220, width: 220, height: 130, fill: '#1F2937', visible: true };
    } else if (type === 'circle') {
      newItem = { id, type: 'circle', x: 180, y: 260, radius: 55, fill: '#7C3AED', visible: true };
    } else {
      newItem = {
        id,
        type: 'sticker',
        x: 160,
        y: 240,
        text: extra || '🔥',
        fill: '#ffffff',
        fontSize: 48,
        visible: true
      };
    }

    pushState([...items, newItem]);
    setSelectedId(id);
    showToast(`Đã thêm ${type} vào Canvas`);
  };

  // Upload Image to Canvas
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        const id = 'item-' + Date.now();
        const aspect = img.width / img.height;
        const w = 200;
        const h = w / aspect;
        const newItem: CanvasItem = {
          id,
          type: 'image',
          x: 50,
          y: 100,
          width: w,
          height: h,
          fill: '',
          imageObj: img,
          visible: true
        };
        pushState([...items, newItem]);
        setSelectedId(id);
        showToast('Đã thêm ảnh vào Canvas!');
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Alignment
  const handleAlign = (type: 'left' | 'center-x' | 'right' | 'center-y') => {
    if (!selectedId) return;
    const newItems = items.map((item) => {
      if (item.id !== selectedId) return item;
      const w =
        item.width ||
        (item.radius ? item.radius * 2 : item.text ? item.text.length * (item.fontSize || 20) * 0.55 : 100);
      const h = item.height || (item.radius ? item.radius * 2 : item.fontSize || 24);
      let { x, y } = item;
      if (type === 'left') x = 24;
      else if (type === 'center-x') x = Math.round((stageDims.width - w) / 2);
      else if (type === 'right') x = Math.round(stageDims.width - w - 24);
      else if (type === 'center-y') y = Math.round((stageDims.height - h) / 2);
      return { ...item, x, y };
    });
    pushState(newItems);
    showToast(`Đã căn chỉnh: ${type}`);
  };

  // Layer Management (Move Up / Down / Toggle Visibility)
  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < items.length - 1) {
      const newItems = [...items];
      const temp = newItems[idx];
      newItems[idx] = newItems[idx + 1];
      newItems[idx + 1] = temp;
      pushState(newItems);
      showToast('Đã chuyển layer lên trên');
    } else if (direction === 'down' && idx > 0) {
      const newItems = [...items];
      const temp = newItems[idx];
      newItems[idx] = newItems[idx - 1];
      newItems[idx - 1] = temp;
      pushState(newItems);
      showToast('Đã chuyển layer xuống dưới');
    }
  };

  const handleToggleVisibility = (id: string) => {
    const newItems = items.map((i) => (i.id === id ? { ...i, visible: i.visible === false ? true : false } : i));
    pushState(newItems);
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      pushState(items.filter((i) => i.id !== selectedId));
      setSelectedId(null);
      showToast('Đã xóa đối tượng');
    }
  };

  // Export Canvas Image (PNG / JPG / PDF)
  const handleExportImage = async () => {
    if (!stageRef.current) return;
    try {
      if (exportFormat === 'pdf') {
        const canvas = stageRef.current.toCanvas({ pixelRatio: 2 });
        await exportCanvasAsPdf(canvas, `CapCut_Design_${format.replace(':', '_')}_${Date.now()}.pdf`);
        showToast(`Đã xuất ${stageDims.label} (PDF chuẩn in ấn)!`, 'success');
        return;
      }
      const mime = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const uri = stageRef.current.toDataURL({ mimeType: mime, quality: 0.95, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = uri;
      a.download = `CapCut_Design_${format.replace(':', '_')}_${Date.now()}.${exportFormat}`;
      a.click();
      showToast(`Đã xuất ${stageDims.label} (${exportFormat.toUpperCase()})!`, 'success');
    } catch (err: any) {
      showToast('Lỗi xuất tệp: ' + err.message, 'error');
    }
  };

  // Send Canvas to Editor as Media Clip & Save to Library
  const handleSendToEditor = async () => {
    if (!stageRef.current) return;
    try {
      const uri = stageRef.current.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const res = await fetch(uri);
      const blob = await res.blob();
      const mediaId = crypto.randomUUID();
      await db.media.add({
        id: mediaId,
        name: `Design_${format.replace(':', '_')}_${Date.now()}.png`,
        type: 'image',
        blob,
        size: blob.size,
        createdAt: Date.now()
      });

      let targetId = currentProjectId;
      if (!targetId) {
        targetId = 'proj-design-' + Date.now();
        const newProj: ProjectEntity = {
          id: targetId,
          title: `Thiết kế Canvas (${format})`,
          width: 1080,
          height: 1920,
          duration: 15,
          fps: 30,
          thumbnail: uri,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDeleted: false
        };
        await db.projects.add(newProj);
        setCurrentProjectId(targetId);
        setProjectTitle(newProj.title);
      }

      addClip({
        track: 'video',
        name: `Canvas (${format})`,
        src: uri,
        type: 'image',
        start: 0,
        duration: 5,
        filter: 'cinematic'
      });

      showToast('Đã lưu Canvas vào Thư viện và chuyển sang Editor!', 'success');
      navigate(`/editor/${targetId}`);
    } catch (err: any) {
      showToast('Lỗi đưa canvas vào Editor: ' + err.message, 'error');
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0B0F19] select-none text-[#E5E7EB]">
      <Header />

      {/* Studio Bar */}
      <div className="h-12 bg-[#0E1320] border-b border-[#1F2937] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1F2937] transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Trang Chủ</span>
          </button>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-purple-400" />
            Design Studio • Trình Thiết Kế Canvas 2D
          </span>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
          {(['9:16', '16:9', '1:1'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => {
                setFormat(fmt);
                showToast(`Đã chuyển khung hình: ${fmt}`);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                format === fmt ? 'bg-purple-600 text-white shadow-sm' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Undo / Redo & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111827] rounded-xl border border-[#1F2937] p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Hoàn tác (Undo)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Làm lại (Redo)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-[#111827] rounded-xl border border-[#1F2937] p-1">
            <button
              onClick={() => setExportFormat('png')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                exportFormat === 'png' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              PNG
            </button>
            <button
              onClick={() => setExportFormat('jpg')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                exportFormat === 'jpg' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              JPG
            </button>
            <button
              onClick={() => setExportFormat('pdf')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                exportFormat === 'pdf' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              PDF
            </button>
          </div>

          <button
            onClick={handleExportImage}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất {exportFormat.toUpperCase()}</span>
          </button>

          <button
            onClick={handleSendToEditor}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Đưa vào Editor</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Toolbar */}
        <div className="w-72 bg-[#0E1320] border-r border-[#1F2937] p-4 flex flex-col gap-4 text-xs overflow-y-auto">
          {/* Add Elements */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Thêm đối tượng:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddItem('text')}
                className="p-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center gap-2 font-bold text-cyan-400 transition-colors"
              >
                <Type className="w-4 h-4" />
                <span>Văn bản</span>
              </button>

              <button
                onClick={() => handleAddItem('rect')}
                className="p-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center gap-2 font-bold text-amber-400 transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Hình hộp</span>
              </button>

              <button
                onClick={() => handleAddItem('circle')}
                className="p-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center gap-2 font-bold text-pink-400 transition-colors"
              >
                <CircleIcon className="w-4 h-4" />
                <span>Hình tròn</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center gap-2 font-bold text-emerald-400 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Tải ảnh lên</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Quick Stickers */}
            <div className="flex items-center gap-1.5 pt-1">
              {['🔥', '✨', '💎', '🚀', '👑', '⚡'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleAddItem('sticker', st)}
                  className="flex-1 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] text-base transition-colors"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment Tools */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Căn chỉnh vị trí:</span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleAlign('left')}
                title="Căn trái"
                className="p-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAlign('center-x')}
                title="Căn giữa ngang"
                className="p-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAlign('right')}
                title="Căn phải"
                className="p-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAlign('center-y')}
                title="Căn giữa dọc"
                className="p-2 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <AlignVerticalJustifyCenter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color & Properties */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Màu nền Canvas:</span>
            <div className="grid grid-cols-5 gap-1.5">
              {['#0B0F19', '#1E1B4B', '#18181B', '#3B0764', '#064E3B'].map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-7 rounded-lg border-2 transition-all ${
                    bgColor === color ? 'border-cyan-400 scale-105' : 'border-[#1F2937]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Selected Item Editor */}
          {selectedItem && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937] bg-[#111827] p-3 rounded-xl border">
              <span className="text-[11px] font-bold text-cyan-400 flex items-center justify-between">
                <span>Chỉnh sửa: {selectedItem.type.toUpperCase()}</span>
                <button
                  onClick={handleDeleteSelected}
                  title="Xóa đối tượng"
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>

              {selectedItem.type === 'text' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400">Nội dung chữ:</span>
                  <input
                    type="text"
                    value={selectedItem.text || ''}
                    onChange={(e) => {
                      const newItems = items.map((i) => (i.id === selectedId ? { ...i, text: e.target.value } : i));
                      setItems(newItems);
                    }}
                    onBlur={() => pushState(items)}
                    className="bg-[#0B0F19] border border-[#1F2937] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Cỡ chữ: {selectedItem.fontSize}px</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const newItems = items.map((i) =>
                            i.id === selectedId ? { ...i, fontSize: Math.max(12, (i.fontSize || 24) - 2) } : i
                          );
                          pushState(newItems);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          const newItems = items.map((i) =>
                            i.id === selectedId ? { ...i, fontSize: Math.min(72, (i.fontSize || 24) + 2) } : i
                          );
                          pushState(newItems);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[10px] text-slate-400">Phông chữ (Font Family):</span>
                    <select
                      value={selectedItem.fontFamily || 'Inter, sans-serif'}
                      onChange={(e) => {
                        const newItems = items.map((i) =>
                          i.id === selectedId ? { ...i, fontFamily: e.target.value } : i
                        );
                        pushState(newItems);
                      }}
                      className="bg-[#0B0F19] border border-[#1F2937] focus:border-cyan-400 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Montserrat, sans-serif">Montserrat</option>
                      <option value="'Dancing Script', cursive">Dancing Script</option>
                      <option value="Oswald, sans-serif">Oswald</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Color options */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">Màu sắc đối tượng:</span>
                <div className="flex items-center gap-1.5">
                  {['#FFFFFF', '#22D3EE', '#EC4899', '#FACC15', '#A855F7', '#10B981'].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        const newItems = items.map((i) => (i.id === selectedId ? { ...i, fill: c } : i));
                        pushState(newItems);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border ${selectedItem.fill === c ? 'border-white ring-2 ring-cyan-400' : 'border-slate-700'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layer Management List */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937] mt-auto">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Danh sách Layers ({items.length}):
            </span>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
              {[...items].reverse().map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-2 rounded-lg flex items-center justify-between border cursor-pointer text-[11px] transition-colors ${
                    selectedId === item.id
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-[#111827] border-[#1F2937] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(item.id);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {item.visible !== false ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </button>
                    <span className="truncate">{item.text || item.type.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(item.id, 'up');
                      }}
                      className="p-1 hover:text-white"
                      title="Lên trên"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(item.id, 'down');
                      }}
                      className="p-1 hover:text-white"
                      title="Xuống dưới"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Canvas Stage */}
        <div className="flex-1 bg-[#07090E] p-6 flex items-center justify-center overflow-auto">
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#1F2937] bg-slate-950 transition-all"
            style={{ width: stageDims.width, height: stageDims.height }}
          >
            <Stage
              ref={stageRef}
              width={stageDims.width}
              height={stageDims.height}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {/* Background Rect */}
                <Rect x={0} y={0} width={stageDims.width} height={stageDims.height} fill={bgColor} />

                {items.map((item) => {
                  if (item.visible === false) return null;

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
                        stroke={selectedId === item.id ? '#22D3EE' : undefined}
                        strokeWidth={2}
                        onClick={() => setSelectedId(item.id)}
                        onDragEnd={(e) => {
                          const { x, y } = e.target.position();
                          const newItems = items.map((i) => (i.id === item.id ? { ...i, x, y } : i));
                          pushState(newItems);
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
                        stroke={selectedId === item.id ? '#22D3EE' : undefined}
                        strokeWidth={2}
                        onClick={() => setSelectedId(item.id)}
                        onDragEnd={(e) => {
                          const { x, y } = e.target.position();
                          const newItems = items.map((i) => (i.id === item.id ? { ...i, x, y } : i));
                          pushState(newItems);
                        }}
                      />
                    );
                  }

                  if (item.type === 'image' && item.imageObj) {
                    return (
                      <KonvaImage
                        key={item.id}
                        x={item.x}
                        y={item.y}
                        image={item.imageObj}
                        width={item.width}
                        height={item.height}
                        draggable
                        stroke={selectedId === item.id ? '#22D3EE' : undefined}
                        strokeWidth={2}
                        onClick={() => setSelectedId(item.id)}
                        onDragEnd={(e) => {
                          const { x, y } = e.target.position();
                          const newItems = items.map((i) => (i.id === item.id ? { ...i, x, y } : i));
                          pushState(newItems);
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
                      fontFamily={item.fontFamily || 'Inter, sans-serif'}
                      fontStyle="bold"
                      fill={item.fill}
                      draggable
                      stroke={selectedId === item.id ? '#22D3EE' : undefined}
                      strokeWidth={selectedId === item.id ? 1 : 0}
                      onClick={() => setSelectedId(item.id)}
                      onDragEnd={(e) => {
                        const { x, y } = e.target.position();
                        const newItems = items.map((i) => (i.id === item.id ? { ...i, x, y } : i));
                        pushState(newItems);
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
