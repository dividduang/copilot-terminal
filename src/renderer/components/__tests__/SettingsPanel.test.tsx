import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';
import { I18nProvider } from '../../i18n';

describe('SettingsPanel', () => {
  beforeEach(() => {
    window.electronAPI.platform = 'win32';
  });

  it('shows the bundled ConPTY setting on Windows', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <SettingsPanel open={true} onClose={() => {}} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('tab', { name: /高级设置/ }));
    expect(screen.getByText('使用随应用附带的 ConPTY 组件')).toBeInTheDocument();
  });

  it('hides the bundled ConPTY setting on macOS', async () => {
    const user = userEvent.setup();
    window.electronAPI.platform = 'darwin';

    render(
      <I18nProvider>
        <SettingsPanel open={true} onClose={() => {}} />
      </I18nProvider>,
    );

    await user.click(screen.getByRole('tab', { name: /高级设置/ }));
    expect(screen.queryByText('使用随应用附带的 ConPTY 组件')).not.toBeInTheDocument();
  });
});
