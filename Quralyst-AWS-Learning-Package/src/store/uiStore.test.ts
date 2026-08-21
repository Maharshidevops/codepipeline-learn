// uiStore theme slice (Phase 25): setTheme persists, cycleTheme wraps through the registry.
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';
import { THEMES } from '@/styles/themes';

describe('uiStore theme slice', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.getState().setTheme('light');
  });

  it('setTheme updates state and persists to localStorage', () => {
    useUiStore.getState().setTheme('dark');
    expect(useUiStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('quralyst.theme')).toBe('dark');
  });

  it('cycleTheme advances through every registry theme in order, then wraps', () => {
    const order = THEMES.map((t) => t.id); // light, dark, auto
    // Start on the first theme, then cycle a full loop + 1 to prove wrapping.
    useUiStore.getState().setTheme(order[0]);
    for (let i = 1; i <= order.length; i++) {
      useUiStore.getState().cycleTheme();
      expect(useUiStore.getState().theme).toBe(order[i % order.length]);
    }
  });

  it('cycleTheme persists each step', () => {
    useUiStore.getState().setTheme('light');
    useUiStore.getState().cycleTheme();
    expect(localStorage.getItem('quralyst.theme')).toBe(useUiStore.getState().theme);
  });
});
