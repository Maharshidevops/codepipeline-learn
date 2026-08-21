// Registry ↔ CSS parity (Phase 27): every non-auto theme in the registry must have a matching
// `:root[data-theme="<id>"]` block in colors.css. Catches the classic "added a theme to themes.ts,
// forgot the CSS block" mistake — and proves the extensibility recipe (add 1 entry + 1 block) holds.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES } from './themes';

describe('theme registry ↔ colors.css parity', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/core/colors.css'), 'utf8');

  for (const t of THEMES) {
    if (t.bsBase === null) continue; // 'auto' renders another theme's palette; it owns no CSS block
    it(`theme "${t.id}" has a [data-theme='${t.id}'] block in colors.css`, () => {
      expect(css).toContain(`[data-theme='${t.id}']`);
    });
  }
});
