import { CustomCategory } from '../../shared/types/custom-category';

/**
 * 更新 settings 中的 customCategories
 * 通过 IPC 调用保存到持久化存储
 * @returns 成功返回 true，失败返回 false
 */
export async function updateSettingsCategories(categories: CustomCategory[]): Promise<boolean> {
  if (!window.electronAPI) {
    console.warn('[CategoryHelpers] electronAPI not available');
    return false;
  }

  try {
    const response = await window.electronAPI.updateSettings({
      customCategories: categories,
    });

    if (!response.success) {
      console.error('[CategoryHelpers] Failed to update settings:', response.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[CategoryHelpers] Error updating settings:', error);
    return false;
  }
}
