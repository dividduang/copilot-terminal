import React, { useCallback } from 'react';

interface NewWindowCardProps {
  onClick: () => void;
}

/**
 * NewWindowCard 组件
 * 虚线边框占位卡片，点击后打开新建窗口对话框
 */
export const NewWindowCard = React.memo<NewWindowCardProps>(({ onClick }) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label="新建窗口"
      data-testid="new-window-card"
      className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer transition-colors hover:border-zinc-400 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="text-4xl text-zinc-400 mb-2 leading-none">+</span>
      <span className="text-sm text-zinc-400">新建窗口</span>
    </div>
  );
});

NewWindowCard.displayName = 'NewWindowCard';
