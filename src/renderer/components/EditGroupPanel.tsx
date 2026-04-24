import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ConfirmDialog';
import { WindowGroup } from '../../shared/types/window-group';
import { getAllWindowIds } from '../utils/groupLayoutHelpers';
import { useWindowStore } from '../stores/windowStore';
import { useI18n } from '../i18n';

interface EditGroupPanelProps {
  group: WindowGroup;
  onClose: () => void;
  onSave: (groupId: string, updates: { name?: string }) => void;
}

/**
 * EditGroupPanel 组件
 * 编辑窗口组面板
 *
 * TODO: 等待任务 #1、#2、#3 完成后实现以下功能：
 * - 修改组名称
 * - 显示组内窗口列表
 * - 支持从组中移除窗口
 * - 支持添加窗口到组
 * - 如果组内只剩 1 个窗口，自动解散组
 * - 调用 IPC 接口更新组
 * - 更新 windowStore 状态
 */
export const EditGroupPanel: React.FC<EditGroupPanelProps> = ({ group, onClose, onSave }) => {
  const { t } = useI18n();
  const windows = useWindowStore((state) => state.windows);
  const removeGroup = useWindowStore((state) => state.removeGroup);
  const removeWindowFromGroupLayout = useWindowStore((state) => state.removeWindowFromGroupLayout);

  const [name, setName] = useState(group.name);
  const [isSaving, setIsSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const pendingRemoveWindowIdRef = useRef<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦到名称字段
  useEffect(() => {
    if (nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, []);

  // 从 group.layout 获取组内窗口列表
  const windowsInGroup = useMemo(() => {
    const windowIds = getAllWindowIds(group.layout);
    return windows.filter(w => windowIds.includes(w.id));
  }, [group.layout, windows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const updates: { name?: string } = {};

      if (name !== group.name) {
        updates.name = name;
      }

      if (Object.keys(updates).length > 0) {
        onSave(group.id, updates);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save group:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && name.trim() && !isSaving) {
      handleSubmit(e as any);
    }
  };

  const handleRemoveWindow = (windowId: string) => {
    // 检查移除后是否只剩 1 个窗口
    const windowIds = getAllWindowIds(group.layout);
    if (windowIds.length <= 2) {
      // 如果移除后只剩 1 个窗口，自动解散组
      pendingRemoveWindowIdRef.current = windowId;
      setShowRemoveConfirm(true);
    } else {
      // 从组中移除窗口
      removeWindowFromGroupLayout(group.id, windowId);
    }
  };

  const handleConfirmRemove = () => {
    if (pendingRemoveWindowIdRef.current) {
      removeWindowFromGroupLayout(group.id, pendingRemoveWindowIdRef.current);
      pendingRemoveWindowIdRef.current = null;
    }
    setShowRemoveConfirm(false);
    onClose();
  };

  const handleAddWindow = () => {
    // TODO: 实现添加窗口到组的逻辑
    // 可以打开一个选择窗口的对话框
    console.log('TODO: 实现添加窗口逻辑');
  };

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
      title={t('editGroup.title')}
      description={t('editGroup.description')}
      contentClassName="max-w-[640px]"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} role="form">
        {/* 组名称 */}
        <div className="mb-4">
          <label htmlFor="group-name" className="block text-sm font-medium text-text-primary mb-2">
            {t('editGroup.nameLabel')} <span className="text-status-error">*</span>
          </label>
          <input
            id="group-name"
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('editGroup.namePlaceholder')}
            required
            className="w-full px-3 py-2 bg-bg-app border border-border-subtle rounded text-text-primary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-status-running"
          />
        </div>

        {/* 组内窗口列表 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-text-primary">
              {t('editGroup.windowsLabel')}
              <span className="text-xs text-text-secondary ml-2">
                ({t('editGroup.windowsCount', { count: windowsInGroup.length })})
              </span>
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddWindow}
              className="text-xs"
            >
              {t('editGroup.addWindow')}
            </Button>
          </div>

          {/* 显示组内窗口列表 */}
          <div className="border border-border-subtle rounded p-3 bg-bg-app max-h-64 overflow-y-auto">
            {windowsInGroup.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">
                {t('editGroup.noWindows')}
              </p>
            ) : (
              <div className="space-y-2">
                {windowsInGroup.map((win) => (
                  <div
                    key={win.id}
                    className="flex items-center justify-between p-2 rounded bg-bg-hover"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {win.name}
                      </div>
                      <div className="text-xs text-text-secondary truncate font-mono">
                        {win.layout.type === 'pane' ? win.layout.pane.cwd : t('editGroup.multiPane')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveWindow(win.id)}
                      className="ml-2 p-1 text-status-error hover:bg-status-error/10 rounded transition-colors"
                      aria-label={t('editGroup.removeWindow')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-text-secondary mt-2">
            {t('editGroup.hint')}
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? t('editGroup.saving') : t('editGroup.save')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title={t('editGroup.removeConfirmTitle')}
        description={t('editGroup.removeConfirmDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmRemove}
        variant="danger"
      />
    </Dialog>
  );
};
