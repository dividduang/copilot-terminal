import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SplitLayout } from '../SplitLayout';
import { LayoutNode, Pane, WindowStatus } from '../../types/window';

const mountCounts: Record<string, number> = {};
const unmountCounts: Record<string, number> = {};
const receivedProps: Array<{ paneId: string; isWindowActive: boolean }> = [];

vi.mock('../TerminalPane', () => ({
  TerminalPane: ({
    pane,
    isWindowActive,
  }: {
    pane: Pane;
    isWindowActive: boolean;
  }) => {
    React.useEffect(() => {
      mountCounts[pane.id] = (mountCounts[pane.id] ?? 0) + 1;
      return () => {
        unmountCounts[pane.id] = (unmountCounts[pane.id] ?? 0) + 1;
      };
    }, [pane.id]);

    receivedProps.push({
      paneId: pane.id,
      isWindowActive,
    });

    return <div data-testid={`pane-${pane.id}`} />;
  },
}));

function createPaneNode(paneId: string): LayoutNode {
  return {
    type: 'pane',
    id: paneId,
    pane: {
      id: paneId,
      cwd: 'D:\\',
      command: 'pwsh.exe',
      status: WindowStatus.Running,
      pid: 1000,
    },
  };
}

describe('SplitLayout', () => {
  beforeEach(() => {
    Object.keys(mountCounts).forEach((key) => delete mountCounts[key]);
    Object.keys(unmountCounts).forEach((key) => delete unmountCounts[key]);
    receivedProps.length = 0;
  });

  it('passes isWindowActive to panes in split layout', () => {
    const layout: LayoutNode = {
      type: 'split',
      direction: 'horizontal',
      sizes: [0.5, 0.5],
      children: [createPaneNode('pane-a'), createPaneNode('pane-b')],
    };

    render(
      <SplitLayout
        windowId="win-1"
        layout={layout}
        activePaneId="pane-a"
        isWindowActive
        onPaneActivate={vi.fn()}
        onPaneClose={vi.fn()}
      />
    );

    const latestByPane = new Map<string, boolean>();
    receivedProps.forEach((entry) => {
      latestByPane.set(entry.paneId, entry.isWindowActive);
    });

    expect(latestByPane.get('pane-a')).toBe(true);
    expect(latestByPane.get('pane-b')).toBe(true);
  });

  it('keeps existing pane mounted when root changes from single pane to split', () => {
    const paneA = createPaneNode('pane-a');

    const { rerender } = render(
      <SplitLayout
        windowId="win-1"
        layout={paneA}
        activePaneId="pane-a"
        isWindowActive
        onPaneActivate={vi.fn()}
        onPaneClose={vi.fn()}
      />
    );

    const splitLayout: LayoutNode = {
      type: 'split',
      direction: 'horizontal',
      sizes: [0.5, 0.5],
      children: [paneA, createPaneNode('pane-b')],
    };

    rerender(
      <SplitLayout
        windowId="win-1"
        layout={splitLayout}
        activePaneId="pane-a"
        isWindowActive
        onPaneActivate={vi.fn()}
        onPaneClose={vi.fn()}
      />
    );

    expect(mountCounts['pane-a']).toBe(1);
    expect(unmountCounts['pane-a'] ?? 0).toBe(0);
    expect(mountCounts['pane-b']).toBe(1);
  });
});
