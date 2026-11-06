import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
  Flame,
  MessageSquarePlus,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getBetaTasks, toggleBetaTask, getBetaTasksProgress, type BetaTask } from '../utils/betaTasks';
import { useEditorStore } from '../store/useEditorStore';

interface Props {
  onClose?: () => void;
  onOpenFeedback?: () => void;
}

export const BetaTasksModal: React.FC<Props> = ({ onClose, onOpenFeedback }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<BetaTask[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 5, percentage: 0 });
  const [expandedId, setExpandedId] = useState<string | null>('task-1-create-30s');

  const loadTasks = () => {
    setTasks(getBetaTasks());
    setProgress(getBetaTasksProgress());
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBetaTask(id);
    loadTasks();
  };

  const handleAction = (task: BetaTask) => {
    if (task.actionUrl) {
      if (onClose) onClose();
      navigate(task.actionUrl);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2.5 text-[#22D3EE]">
          <Flame className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-white">Nhiệm Vụ Thử Nghiệm Beta Kín (Closed Beta)</h3>
            <p className="text-[11px] text-[#9CA3AF]">
              Hoàn thành 5 kịch bản thử nghiệm để giúp chúng tôi kiểm chứng chất lượng và trải nghiệm
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTasks}
            className="p-1.5 rounded-lg bg-[#141B2D] hover:bg-[#1E2842] text-[#8E9BB0] hover:text-white transition-colors"
            title="Làm mới tiến độ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Progress Tracker Bar */}
      <div className="p-4 rounded-2xl bg-[#0D121F] border border-cyan-500/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#22D3EE]" />
            <span>Tiến độ hoàn thành kịch bản:</span>
          </span>
          <span className="font-mono font-bold text-[#22D3EE]">
            {progress.completed}/{progress.total} nhiệm vụ ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full bg-[#1A2234] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1FC8DB] to-cyan-400 transition-all duration-500 rounded-full"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* 3. Task List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {tasks.map((task) => {
          const isExpanded = expandedId === task.id;
          return (
            <div
              key={task.id}
              className={`rounded-xl border transition-all ${
                task.completed
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-[#0B0F19] border-[#1F2937] hover:border-[#2A3752]'
              }`}
            >
              {/* Task Header Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
                className="p-3 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggle(task.id, e)}
                    className="shrink-0 text-slate-400 hover:text-white transition-colors"
                    title={task.completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-[#22D3EE]" />
                    )}
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs font-bold truncate ${
                        task.completed ? 'line-through text-[#6B7A90]' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[10px] text-[#8E9BB0] truncate">{task.description}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-[#141B2D] border border-[#1E2842] text-[#8E9BB0]">
                    {task.targetAudience}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Task Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-3.5 pt-1 border-t border-[#1F2937]/50 flex flex-col gap-2.5 text-xs text-[#9CA3AF]">
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-white block">Các bước thực hiện:</span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-[#CBD5E1]">
                      {task.steps.map((st, sidx) => (
                        <li key={sidx}>{st}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]/40">
                    <button
                      type="button"
                      onClick={(e) => handleToggle(task.id, e)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        task.completed
                          ? 'bg-[#141B2D] border-[#1E2842] text-[#8E9BB0]'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                      }`}
                    >
                      {task.completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                    </button>

                    {task.actionUrl && (
                      <button
                        type="button"
                        onClick={() => handleAction(task)}
                        className="px-3 py-1 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-black border border-[#22D3EE]/30 text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <span>{task.actionLabel || 'Thực hiện ngay'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Callout to Report Issues */}
      <div className="p-3.5 rounded-xl bg-[#141B2D] border border-[#1E2842] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[#CBD5E1]">
            Gặp khó khăn, lỗi hoặc có đề xuất cải thiện trong lúc thử?
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onOpenFeedback) onOpenFeedback();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#22D3EE] to-sky-400 text-slate-950 font-bold text-xs hover:opacity-90 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          Góp ý ngay
        </button>
      </div>
    </div>
  );
};
