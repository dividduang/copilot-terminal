import React from 'react';

interface ToolbarProps {
  appName?: string;
  version?: string;
}

export function Toolbar({
  appName = 'ausome-terminal',
  version = '0.1.0'
}: ToolbarProps) {
  return (
    <header className="h-14 px-6 flex items-center justify-between bg-bg-card border-b border-border-subtle">
      {/* 左侧：应用名称和版本 */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-text-primary">
          {appName}
        </h1>
        <span className="text-sm text-text-secondary">
          v{version}
        </span>
      </div>

      {/* 右侧：预留给后续功能（状态统计、新建按钮等） */}
      <div className="flex items-center gap-3">
        {/* 后续 Story 会添加内容 */}
      </div>
    </header>
  );
}
