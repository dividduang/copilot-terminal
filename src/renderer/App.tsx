import React, { useState, useCallback } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Toolbar } from './components/layout/Toolbar';
import { EmptyState } from './components/EmptyState';
import { CardGrid } from './components/CardGrid';
import { useWindowStore } from './stores/windowStore';

function App() {
  const windows = useWindowStore((state) => state.windows);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateWindow = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
  }, []);

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
        <CardGrid onCreateWindow={handleCreateWindow} />
      )}
    </MainLayout>
  );
}

export default App;
