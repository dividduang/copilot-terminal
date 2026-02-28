import React, { useState, useCallback, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Toolbar } from './components/layout/Toolbar';
import { EmptyState } from './components/EmptyState';
import { CardGrid } from './components/CardGrid';
import { TerminalView } from './components/TerminalView';
import { useWindowStore } from './stores/windowStore';
import { subscribeToWindowStatusChange } from './api/events';
import { Window } from './types/window';

function App() {
  const windows = useWindowStore((state) => state.windows);
  const updateWindowStatus = useWindowStore((state) => state.updateWindowStatus);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTerminalWindow, setActiveTerminalWindow] = useState<Window | null>(null);

  // 订阅主进程推送的窗口状态变化事件
  useEffect(() => {
    const unsubscribe = subscribeToWindowStatusChange((windowId, status) => {
      updateWindowStatus(windowId, status);
    });
    return () => {
      unsubscribe();
    };
  }, [updateWindowStatus]);

  const handleCreateWindow = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
  }, []);

  const handleEnterTerminal = useCallback((win: Window) => {
    setActiveTerminalWindow(win);
  }, []);

  const handleReturnFromTerminal = useCallback(() => {
    setActiveTerminalWindow(null);
  }, []);

  // 终端视图：全屏覆盖
  if (activeTerminalWindow) {
    return (
      <TerminalView
        window={activeTerminalWindow}
        onReturn={handleReturnFromTerminal}
      />
    );
  }

  return (
    <MainLayout
      toolbar={
        <Toolbar
          appName="ausome-terminal"
          version="0.1.0"
          onCreateWindow={handleCreateWindow}
          isDialogOpen={isDialogOpen}
          onDialogChange={handleDialogChange}
        />
      }
    >
      {windows.length === 0 ? (
        <EmptyState onCreateWindow={handleCreateWindow} />
      ) : (
        <CardGrid onCreateWindow={handleCreateWindow} onEnterTerminal={handleEnterTerminal} />
      )}
    </MainLayout>
  );
}

export default App;
