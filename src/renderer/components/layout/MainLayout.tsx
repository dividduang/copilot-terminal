import React from 'react';

interface MainLayoutProps {
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ toolbar, children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-bg-app">
      {/* 工具栏区域 - 固定高度 */}
      <div className="flex-shrink-0">
        {toolbar}
      </div>

      {/* 主内容区 - 占满剩余空间 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
