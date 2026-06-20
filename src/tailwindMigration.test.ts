import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = resolve(dirname(fileURLToPath(import.meta.url)));

/** Recursively collect every file under `dir` whose name ends in `ext`. */
function collectFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full, ext));
    } else if (entry.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

describe('Tailwind v4 migration', () => {
  it('removed every legacy stylesheet from src/styles', () => {
    // The conversion deleted the per-feature CSS files; if any come back, the
    // index.html entry (which now only loads index.css) would 404 them.
    expect(() => statSync(join(srcRoot, 'styles'))).toThrow();
  });

  it('has no dangling imports of the deleted stylesheets', () => {
    const deleted = [
      'admin.css', 'base.css', 'bracket.css', 'buttons.css', 'chrome.css',
      'groups.css', 'modal.css', 'predictions.css', 'responsive.css',
      'third-place.css', 'tokens.css',
    ];
    const sources = [...collectFiles(srcRoot, '.ts'), ...collectFiles(srcRoot, '.tsx')];
    const offenders: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      for (const name of deleted) {
        if (text.includes(`styles/${name}`) || text.includes(`/${name}'`) || text.includes(`/${name}"`)) {
          offenders.push(`${file} → ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('index.css is the single entry point and pulls in Tailwind', () => {
    const css = readFileSync(join(srcRoot, 'index.css'), 'utf8');
    expect(css).toMatch(/@import\s+['"]tailwindcss['"]/);
    // The brand palette must still be exposed as Tailwind utilities.
    expect(css).toContain('--color-crimson');
    expect(css).toContain('--color-navy');
    expect(css).toContain('--color-gold');
  });

  it('main.tsx is the sole importer of index.css (Vite injects it, not a <link>)', () => {
    const sources = [...collectFiles(srcRoot, '.ts'), ...collectFiles(srcRoot, '.tsx')];
    const importers = sources
      .map(f => ({ f, text: readFileSync(f, 'utf8') }))
      .filter(({ text }) => /import\s+['"][^'"]*index\.css['"]/.test(text));

    expect(importers).toHaveLength(1);
    expect(importers[0].f).toMatch(/main\.tsx$/);
  });

  it('index.html carries no leftover <link> stylesheets (CSS rides the JS bundle)', () => {
    const html = readFileSync(join(resolve(srcRoot, '..'), 'index.html'), 'utf8');
    const sheets = [...html.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*>/g)];
    expect(sheets).toHaveLength(0);
  });
});
