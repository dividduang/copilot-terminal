import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ArrowLeft, SplitSquareHorizontal, SplitSquareVertical, Folder, Archive, Square } from 'lucide-react';
import { Window, Pane, WindowStatus } from '../types/window';
import { getAggregatedStatus, getAllPanes } from '../utils/layoutHelpers';
import { Sidebar } from './Sidebar';
import { QuickSwitcher } from './QuickSwitcher';
import { SplitLayout } from './SplitLayout';
import { SettingsPanel } from './SettingsPanel';
import { useWindowStore } from '../stores/windowStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { IDEIcon } from './icons/IDEIcons';
import { useIDESettings } from '../hooks/useIDESettings';
import { ProjectLinks } from './ProjectLinks';
import { useI18n } from '../i18n';

export interface TerminalViewProps {
  window: Window;
  onReturn: () => void;
  onWindowSwitch: (windowId: string) => void;
  isActive: boolean;
}

/**
 * TerminalView 缁勪欢
 * 鏀寔澶氱獥鏍兼媶鍒嗙殑缁堢瑙嗗浘
 */
export const TerminalView: React.FC<TerminalViewProps> = ({
  window: terminalWindow,
  onReturn,
  onWindowSwitch,
  isActive,
}) => {
  const { t } = useI18n();
  const { enabledIDEs } = useIDESettings();
  const aggregatedStatus = useMemo(() => getAggregatedStatus(terminalWindow.layout), [terminalWindow.layout]);
  const panes = useMemo(() => getAllPanes(terminalWindow.layout), [terminalWindow.layout]);

  // 鍒囨崲闈㈡澘鐘舵€?
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  // Store
  const {
    toggleSidebar,
    getActiveWindows,
    splitPaneInWindow,
    closePaneInWindow,
    setActivePane,
    archiveWindow,
    updatePane,
    pauseWindowState,
  } = useWindowStore();
  const activeWindows = getActiveWindows();

  // 纭繚绐楀彛婵€娲绘椂锛屾縺娲荤涓€涓獥鏍?
  useEffect(() => {
    if (!isActive) return;

    const paneIds = panes.map(p => p.id);

    // 濡傛灉娌℃湁婵€娲荤殑绐楁牸锛屾垨婵€娲荤殑绐楁牸涓嶅湪褰撳墠绐楁牸鍒楄〃涓紝鍒欐縺娲荤涓€涓獥鏍?
    if (!terminalWindow.activePaneId || !paneIds.includes(terminalWindow.activePaneId)) {
      if (panes.length > 0) {
        setActivePane(terminalWindow.id, panes[0].id);
      }
    }

    // 绐楀彛婵€娲绘椂锛屽惎鍔?git 鍒嗘敮鐩戝惉
    const firstPane = panes[0];
    if (firstPane && firstPane.cwd && window.electronAPI?.startGitWatch) {
      window.electronAPI.startGitWatch(terminalWindow.id, firstPane.cwd).catch((error: any) => {
        // 蹇界暐閿欒
      });
    }

    // 绐楀彛澶辨椿鏃讹紝鍋滄 git 鍒嗘敮鐩戝惉
    return () => {
      if (window.electronAPI?.stopGitWatch) {
        window.electronAPI.stopGitWatch(terminalWindow.id).catch((error: any) => {
          // 蹇界暐閿欒
        });
      }
    };
  }, [isActive, terminalWindow.activePaneId, terminalWindow.id, panes, setActivePane]);

  // 蹇嵎閿鐞?
  useKeyboardShortcuts({
    onCtrlTab: () => {
      setQuickSwitcherOpen(true);
    },
    onCtrlB: () => {
      toggleSidebar();
    },
    onCtrlNumber: (num) => {
      if (num > 0 && num <= activeWindows.length) {
        const targetWindow = activeWindows[num - 1];
        if (targetWindow) {
          onWindowSwitch(targetWindow.id);
        }
      }
    },
    onEscape: () => {
      // 鍙湁褰撻潰鏉挎墦寮€鏃舵墠澶勭悊 ESC 閿?
      if (quickSwitcherOpen) {
        setQuickSwitcherOpen(false);
        return true; // 琛ㄧず宸插鐞嗭紝闃绘浼犳挱鍒扮粓绔?
      }
      // 娌℃湁闈㈡澘鎵撳紑鏃讹紝杩斿洖 false锛岃 ESC 閿紶閫掑埌缁堢
      return false;
    },
    enabled: isActive,
  });

  // 澶勭悊绐楁牸婵€娲?
  const handlePaneActivate = useCallback(
    (paneId: string) => {
      setActivePane(terminalWindow.id, paneId);
    },
    [terminalWindow.id, setActivePane]
  );

  // 澶勭悊绐楁牸鍏抽棴
  const handlePaneClose = useCallback(
    (paneId: string) => {
      // 濡傛灉鍙湁涓€涓獥鏍硷紝涓嶅厑璁稿叧闂?
      if (panes.length <= 1) {
        return;
      }
      closePaneInWindow(terminalWindow.id, paneId);
    },
    [terminalWindow.id, panes.length, closePaneInWindow]
  );

  // 澶勭悊鎷嗗垎绐楁牸
  const handleSplitPane = useCallback(
    async (direction: 'horizontal' | 'vertical') => {
      const activePaneId = terminalWindow.activePaneId;
      if (!activePaneId) return;

      // 鑾峰彇褰撳墠婵€娲荤獥鏍肩殑淇℃伅
      const { getPaneById } = useWindowStore.getState();
      const activePane = getPaneById(terminalWindow.id, activePaneId);
      const currentCwd = activePane?.cwd || 'D:\\';
      const currentCommand = activePane?.command || 'pwsh.exe';

      // 鍒涘缓鏂扮獥鏍?
      const newPaneId = uuidv4();
      const newPane: Pane = {
        id: newPaneId,
        cwd: currentCwd, // 浣跨敤褰撳墠绐楁牸鐨勫伐浣滅洰褰?
        command: currentCommand, // 浣跨敤褰撳墠绐楁牸鐨勫懡浠?
        status: WindowStatus.Restoring,
        pid: null,
      };

      // 先把新 pane 插入布局，避免把 PTY 启动耗时直接表现成”拆分很慢”
      splitPaneInWindow(terminalWindow.id, activePaneId, direction, newPane);

      // 异步创建 PTY 进程，完成后再补齐 pid/状态
      try {
        if (window.electronAPI) {
          const response = await window.electronAPI.splitPane({
            workingDirectory: newPane.cwd,
            command: newPane.command,
            windowId: terminalWindow.id,
            paneId: newPaneId,
          });

          if (response && response.success && response.data) {
            const paneStillExists = useWindowStore.getState().getPaneById(terminalWindow.id, newPaneId);
            if (!paneStillExists) {
              await window.electronAPI.closePane(terminalWindow.id, newPaneId);
              return;
            }

            updatePane(terminalWindow.id, newPaneId, {
              pid: response.data.pid,
              status: WindowStatus.Running,
            });
          } else {
            throw new Error(response?.error || t('terminalView.splitFailed'));
          }
        }
      } catch (error) {
        console.error('Failed to split pane:', error);
        closePaneInWindow(terminalWindow.id, newPaneId, { syncProcess: false });
        return;
      }
    },
    [t, terminalWindow.id, terminalWindow.activePaneId, splitPaneInWindow, updatePane, closePaneInWindow]
  );

  // 澶勭悊鎵撳紑鏂囦欢澶?
  const handleOpenFolder = useCallback(async () => {
    try {
      // 鑾峰彇绗竴涓獥鏍肩殑宸ヤ綔鐩綍
      const firstPane = panes[0];
      if (firstPane && window.electronAPI) {
        await window.electronAPI.openFolder(firstPane.cwd);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [panes]);

  // 澶勭悊鍦?IDE 涓墦寮€
  const handleOpenInIDE = useCallback(async (ide: string) => {
    try {
      const firstPane = panes[0];
      if (firstPane && window.electronAPI) {
        const response = await window.electronAPI.openInIDE(ide, firstPane.cwd);
        if (!response.success) {
          console.error(`Failed to open in ${ide}:`, response.error);
        }
      }
    } catch (error) {
      console.error(`Failed to open in ${ide}:`, error);
    }
  }, [panes]);

  // 澶勭悊鏆傚仠绐楀彛
  const handlePauseWindow = useCallback(async () => {
    try {
      // 鍏抽棴绐楀彛锛堢粓姝㈡墍鏈?PTY 杩涚▼锛?
      await window.electronAPI.closeWindow(terminalWindow.id);

      pauseWindowState(terminalWindow.id);
    } catch (error) {
      console.error('Failed to pause window:', error);
    }
  }, [terminalWindow.id, pauseWindowState]);

  // 澶勭悊褰掓。绐楀彛
  const handleArchiveWindow = useCallback(async () => {
    try {
      // 鑾峰彇鎵€鏈夋湭褰掓。鐨勭獥鍙?
      const { windows } = useWindowStore.getState();
      const activeWindows = windows.filter(w => !w.archived && w.id !== terminalWindow.id);

      // 鏌ユ壘绗竴涓瓑寰呰緭鍏ョ殑绐楀彛
      let targetWindow = activeWindows.find(w => {
        const windowPanes = getAllPanes(w.layout);
        return windowPanes.some(pane => pane.status === WindowStatus.WaitingForInput);
      });

      // 濡傛灉娌℃湁绛夊緟杈撳叆鐨勭獥鍙ｏ紝鎵剧涓€涓椿璺冪獥鍙?
      if (!targetWindow && activeWindows.length > 0) {
        targetWindow = activeWindows[0];
      }

      // 濡傛灉鎵惧埌浜嗙洰鏍囩獥鍙ｏ紝鍏堝垏鎹㈣繃鍘?
      if (targetWindow) {
        onWindowSwitch(targetWindow.id);

        // 绛夊緟鍒囨崲瀹屾垚鍚庡啀鍏抽棴鍜屽綊妗ｅ綋鍓嶇獥鍙?
        setTimeout(async () => {
          try {
            await window.electronAPI.closeWindow(terminalWindow.id);
            archiveWindow(terminalWindow.id);
          } catch (error) {
            console.error('Failed to close and archive window:', error);
          }
        }, 100);
      } else {
        // 娌℃湁鍏朵粬绐楀彛锛屽叧闂苟褰掓。鍚庤繑鍥炰富鐣岄潰
        await window.electronAPI.closeWindow(terminalWindow.id);
        archiveWindow(terminalWindow.id);
        onReturn();
      }
    } catch (error) {
      console.error('Failed to archive window:', error);
    }
  }, [terminalWindow.id, archiveWindow, onReturn, onWindowSwitch]);

  // 澶勭悊蹇€熷垏鎹?
  const handleQuickSwitcherSelect = useCallback(
    (windowId: string) => {
      setQuickSwitcherOpen(false);
      onWindowSwitch(windowId);
    },
    [onWindowSwitch]
  );

  return (
    <div className="flex h-screen w-screen bg-zinc-900 overflow-hidden">
      {/* 渚ц竟鏍?*/}
      <Sidebar
        activeWindowId={terminalWindow.id}
        onWindowSelect={onWindowSwitch}
        onSettingsClick={() => setIsSettingsPanelOpen(true)}
      />

      {/* 涓诲唴瀹瑰尯 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 椤堕儴宸ュ叿鏍?*/}
        <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between pl-1 pr-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* 杩斿洖鎸夐挳 */}
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={onReturn}
                    className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-xs z-50 shadow-xl border border-zinc-700"
                    sideOffset={5}
                  >
                    {t('terminalView.return')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            {/* 绐楀彛鍚嶇О鍜?git 鍒嗘敮 */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-medium text-sm">{terminalWindow.name}</span>
              {terminalWindow.gitBranch && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                  </svg>
                  {terminalWindow.gitBranch}
                </span>
              )}
            </div>
          </div>

          {/* 鍙充晶鎸夐挳缁?*/}
          <div className="flex items-center gap-2">
            {/* 椤圭洰閾炬帴 */}
            {terminalWindow.projectConfig && terminalWindow.projectConfig.links.length > 0 && (
              <>
                <ProjectLinks
                  links={terminalWindow.projectConfig.links}
                  variant="toolbar"
                  maxDisplay={6}
                />
                {/* 鍒嗛殧绾?*/}
                <div className="w-px h-4 bg-zinc-700" />
              </>
            )}

            {/* 鍔ㄦ€佹覆鏌撳惎鐢ㄧ殑 IDE 鍥炬爣 */}
            {enabledIDEs.map((ide) => (
              <Tooltip.Provider key={ide.id}>
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger asChild>
                    <button
                      onClick={() => handleOpenInIDE(ide.id)}
                      className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
                      title={t('common.openInIDE', { name: ide.name })}
                    >
                      <IDEIcon icon={ide.icon || ''} size={14} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-xs z-50 shadow-xl border border-zinc-700"
                      sideOffset={5}
                    >
                      {t('common.openInIDE', { name: ide.name })}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            ))}

            {/* 褰掓。鎸夐挳 */}
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleArchiveWindow}
                    className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
                    title={t('terminalView.archive')}
                  >
                    <Archive size={14} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-xs z-50 shadow-xl border border-zinc-700"
                    sideOffset={5}
                  >
                    {t('terminalView.archive')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            {/* 鎵撳紑鏂囦欢澶规寜閽?*/}
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={handleOpenFolder}
                    className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
                    title={t('terminalView.openFolder')}
                  >
                    <Folder size={14} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-xs z-50 shadow-xl border border-zinc-700"
                    sideOffset={5}
                  >
                    {t('terminalView.openFolder')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            {/* 宸﹀彸鎷嗗垎鎸夐挳 */}
            <button
              onClick={() => handleSplitPane('horizontal')}
              className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              title={t('terminalView.splitHorizontal')}
            >
              <SplitSquareHorizontal size={14} />
            </button>

            {/* 涓婁笅鎷嗗垎鎸夐挳 */}
            <button
              onClick={() => handleSplitPane('vertical')}
              className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              title={t('terminalView.splitVertical')}
            >
              <SplitSquareVertical size={14} />
            </button>

            {/* 鏆傚仠鎸夐挳 - 浠呭湪杩愯鎴栫瓑寰呰緭鍏ユ椂鏄剧ず */}
            {(aggregatedStatus === WindowStatus.Running || aggregatedStatus === WindowStatus.WaitingForInput) && (
              <Tooltip.Provider>
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger asChild>
                    <button
                      onClick={handlePauseWindow}
                      className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-red-500 transition-colors"
                      title={t('terminalView.stop')}
                    >
                      <Square size={14} fill="currentColor" />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-zinc-800 text-zinc-100 px-2 py-1 rounded text-xs z-50 shadow-xl border border-zinc-700"
                      sideOffset={5}
                    >
                      {t('terminalView.stop')}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
        </div>

        {/* 缁堢甯冨眬鍖哄煙 */}
        <div className="flex-1 overflow-hidden">
          <SplitLayout
            windowId={terminalWindow.id}
            layout={terminalWindow.layout}
            activePaneId={terminalWindow.activePaneId}
            isWindowActive={isActive}
            onPaneActivate={handlePaneActivate}
            onPaneClose={handlePaneClose}
          />
        </div>
      </div>

      {/* 蹇€熷垏鎹㈤潰鏉?*/}
      {quickSwitcherOpen && (
        <QuickSwitcher
          isOpen={quickSwitcherOpen}
          currentWindowId={terminalWindow.id}
          onSelect={handleQuickSwitcherSelect}
          onClose={() => setQuickSwitcherOpen(false)}
        />
      )}

      {/* 设置面板 */}
      <SettingsPanel
        open={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
      />

    </div>
  );
};

TerminalView.displayName = 'TerminalView';

