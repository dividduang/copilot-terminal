import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { CreateWindowDialog } from '../CreateWindowDialog';

interface ToolbarProps {
  appName?: string;
  version?: string;
}

export function Toolbar({
  appName = 'ausome-terminal',
  version = '0.1.0'
}: ToolbarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
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

        {/* 右侧：新建窗口按钮 */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setIsDialogOpen(true)}
          >
            + 新建窗口
          </Button>
        </div>
      </header>

      <CreateWindowDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
