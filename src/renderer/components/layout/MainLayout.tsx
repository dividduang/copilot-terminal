import React from 'react';

interface MainLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-900">
      {/* 侧边栏区域 - 固定宽度 */}
      {sidebar && (
        <div className="flex-shrink-0">
          {sidebar}
        </div>
      )}

      {/* 主内容区 - 占满剩余空间 */}
      <main className="flex-1 overflow-auto bg-zinc-900">
        {children}
      </main>
    </div>
  );
}
