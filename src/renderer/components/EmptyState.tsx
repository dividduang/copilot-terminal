import React from 'react';
import { Terminal, Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateWindow?: () => void;
}

export const EmptyState = React.memo<EmptyStateProps>(({ onCreateWindow }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* 图标 */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6 border border-blue-500/20">
        <Terminal size={40} className="text-blue-400" />
      </div>

      {/* 引导文案 */}
      <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
        欢迎使用 Ausome Terminal
      </h2>
      <p className="text-base text-zinc-400 mb-8">
        创建你的第一个终端窗口开始工作
      </p>

      {/* 新建窗口按钮 */}
      <button
        onClick={onCreateWindow}
        className="flex items-center gap-3 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus size={20} />
        <span>新建终端</span>
      </button>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

