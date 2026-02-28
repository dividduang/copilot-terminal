import React from 'react';
import { Button } from './ui/Button';

interface EmptyStateProps {
  onCreateWindow?: () => void;
}

export function EmptyState({ onCreateWindow }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* 引导文案 */}
      <p className="text-xl text-text-primary mb-6">
        创建你的第一个任务窗口
      </p>

      {/* 新建窗口按钮 */}
      <Button
        variant="primary"
        onClick={onCreateWindow}
        className="text-lg px-8 py-3"
      >
        + 新建窗口
      </Button>
    </div>
  );
}
