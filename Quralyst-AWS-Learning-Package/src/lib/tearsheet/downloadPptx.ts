// Lazy PPTX export for tearsheets (F40.2) — native shapes/tables/charts (Replit parity).
import { buildSlides, type Slide, type SlideBlock } from '@/lib/tearsheet/buildSlides';
import type { Tearsheet } from '@/types';

const INK = '282561';
const MUTED = '64748b';
const ACCENT = '282561';
const RULE = 'e2e8f0';
const ROW_ALT = 'f8fafc';
const CHART_BLUE = '60a5fa';

type PptxSlide = {
  addText: (...args: unknown[]) => void;
  addShape: (...args: unknown[]) => void;
  addTable: (...args: unknown[]) => void;
  addChart?: (...args: unknown[]) => void;
};

type PptxApi = {
  ShapeType: { rect: unknown };
  charts?: { line: unknown };
  addSlide: () => PptxSlide;
  layout: string;
  author: string;
  title: string;
  writeFile: (opts: { fileName: string }) => Promise<void>;
};

function colWidths(count: number, total = 9): number[] {
  if (count <= 0) return [total];
  if (count === 1) return [total];
  if (count === 2) return [total * 0.35, total * 0.65];
  if (count === 3) return [total * 0.28, total * 0.36, total * 0.36];
  if (count === 4) return [total * 0.22, total * 0.28, total * 0.2, total * 0.3];
  const mid = count - 2;
  const first = total * 0.2;
  const last = total * 0.32;
  const rest = (total - first - last) / Math.max(mid, 1);
  return [first, ...Array.from({ length: mid }, () => rest), last];
}

function cellText(value: unknown): string {
  const s = value == null ? '' : String(value);
  return s.trim() || '—';
}

/** Render content blocks with a running Y cursor so tables get native PPTX tables. */
function renderBlocks(s: PptxSlide, blocks: SlideBlock[], startY: number, pptx?: PptxApi): void {
  let y = startY;
  const maxY = 5.05;
  const left = 0.5;
  const width = 9;

  for (const b of blocks) {
    if (y >= maxY - 0.2) break;

    if (b.kind === 'paragraph') {
      const h = Math.min(1.1, Math.max(0.45, b.text.length / 110));
      s.addText(b.text, {
        x: left,
        y,
        w: width,
        h,
        fontSize: 12,
        color: INK,
        valign: 'top',
      });
      y += h + 0.12;
      continue;
    }

    if (b.kind === 'bullets') {
      if (b.heading) {
        s.addText(b.heading.toUpperCase(), {
          x: left,
          y,
          w: width,
          h: 0.28,
          fontSize: 11,
          bold: true,
          color: ACCENT,
        });
        y += 0.3;
      }
      const items = b.items.map((t) => ({ text: t, options: { bullet: true } }));
      const h = Math.min(2.2, Math.max(0.4, items.length * 0.28));
      s.addText(items, {
        x: left,
        y,
        w: width,
        h,
        fontSize: 12,
        color: INK,
        valign: 'top',
      });
      y += h + 0.12;
      continue;
    }

    if (b.kind === 'columns') {
      const colW = width / Math.max(b.columns.length, 1);
      let maxH = 0.4;
      b.columns.forEach((col, i) => {
        let cy = y;
        if (col.heading) {
          s.addText(col.heading.toUpperCase(), {
            x: left + i * colW,
            y: cy,
            w: colW - 0.15,
            h: 0.28,
            fontSize: 11,
            bold: true,
            color: ACCENT,
          });
          cy += 0.3;
        }
        const items = col.items.map((t) => ({ text: t, options: { bullet: true } }));
        const h = Math.min(2.0, Math.max(0.4, items.length * 0.28));
        s.addText(items, {
          x: left + i * colW,
          y: cy,
          w: colW - 0.15,
          h,
          fontSize: 11,
          color: INK,
          valign: 'top',
        });
        maxH = Math.max(maxH, cy - y + h);
      });
      y += maxH + 0.12;
      continue;
    }

    if (b.kind === 'keyvalue') {
      const rows = b.rows.map(([k, v], i) => [
        {
          text: k,
          options: {
            bold: true,
            color: MUTED,
            fill: { color: i % 2 ? ROW_ALT : 'FFFFFF' },
          },
        },
        {
          text: cellText(v),
          options: { color: INK, fill: { color: i % 2 ? ROW_ALT : 'FFFFFF' } },
        },
      ]);
      const tableH = Math.min(2.4, 0.32 * rows.length);
      s.addTable(rows, {
        x: left,
        y,
        w: width,
        colW: [width * 0.35, width * 0.65],
        border: [{ pt: 0 }, { pt: 0 }, { pt: 0 }, { pt: 0 }],
        fontSize: 11,
      });
      y += tableH + 0.14;
      continue;
    }

    if (b.kind === 'table') {
      const cols = b.headers.length;
      const headerRow = b.headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          color: 'FFFFFF',
          fill: { color: INK },
          align: 'left',
          valign: 'middle',
        },
      }));
      const bodyRows = b.rows.map((row, ri) =>
        Array.from({ length: cols }, (_, ci) => ({
          text: cellText(row[ci]),
          options: {
            color: INK,
            fill: { color: ri % 2 === 1 ? ROW_ALT : 'FFFFFF' },
            align: 'left',
            valign: 'top',
          },
        })),
      );
      const tableRows = [headerRow, ...bodyRows];
      const tableH = Math.min(maxY - y, Math.max(0.55, tableRows.length * 0.38));
      s.addTable(tableRows, {
        x: left,
        y,
        w: width,
        h: tableH,
        colW: colWidths(cols, width),
        border: [
          { pt: 0.5, color: RULE },
          { pt: 0.5, color: RULE },
          { pt: 0.5, color: RULE },
          { pt: 0.5, color: RULE },
        ],
        fontFace: 'Arial',
        fontSize: cols >= 5 ? 9 : 10,
        valign: 'top',
      });
      y += tableH + 0.14;
      continue;
    }

    if (b.kind === 'charts') {
      for (const series of b.items) {
        const heading = series.heading || 'Trend';
        if (y >= maxY - 1.2) break;
        s.addText(heading.toUpperCase(), {
          x: left,
          y,
          w: width,
          h: 0.26,
          fontSize: 11,
          bold: true,
          color: ACCENT,
        });
        y += 0.28;
        const labels = series.points.map(([d]) => {
          const dt = new Date(d);
          return Number.isNaN(dt.getTime())
            ? d
            : dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        const values = series.points.map(([, v]) => v);
        if (typeof s.addChart === 'function') {
          try {
            const chartType = pptx?.charts?.line ?? 'line';
            s.addChart(chartType, {
              x: left,
              y,
              w: width,
              h: 1.35,
              showLegend: false,
              lineDataSymbol: 'circle',
              lineDataSymbolSize: 6,
              chartColors: [series.color?.replace('#', '') || CHART_BLUE],
              catAxisLabelColor: MUTED,
              valAxisLabelColor: MUTED,
              catAxisLabelFontSize: 9,
              valAxisLabelFontSize: 9,
              chartData: [{ name: heading, labels, values }],
            });
            y += 1.45;
            continue;
          } catch {
            // fall through to text summary
          }
        }
        const first = series.points[0];
        const last = series.points[series.points.length - 1];
        const summary =
          first && last
            ? `${heading}: ${first[1]} → ${last[1]} (${series.points.length} points)`
            : heading;
        s.addText(summary, {
          x: left,
          y,
          w: width,
          h: 0.32,
          fontSize: 12,
          color: INK,
        });
        y += 0.36;
      }
      continue;
    }

    if (b.kind === 'people') {
      for (const g of b.groups) {
        if (g.heading) {
          s.addText(g.heading.toUpperCase(), {
            x: left,
            y,
            w: width,
            h: 0.28,
            fontSize: 11,
            bold: true,
            color: ACCENT,
          });
          y += 0.3;
        }
        for (const p of g.people) {
          if (y >= maxY - 0.2) break;
          const line = p.detail ? `${p.name} — ${p.title}: ${p.detail}` : `${p.name} — ${p.title}`;
          s.addText(line, {
            x: left,
            y,
            w: width,
            h: 0.32,
            fontSize: 11,
            color: INK,
          });
          y += 0.34;
        }
      }
    }
  }
}

function renderContentSlide(
  pptx: PptxApi,
  s: PptxSlide,
  slide: Extract<Slide, { variant: 'content' }>,
  companyName: string,
  index: number,
  total: number,
) {
  s.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: 'FFFFFF' },
  });

  if (slide.kicker) {
    s.addText(slide.kicker.toUpperCase(), {
      x: 0.5,
      y: 0.28,
      w: 7.2,
      h: 0.28,
      fontSize: 11,
      color: MUTED,
      bold: true,
    });
  }
  if (slide.confidence) {
    s.addText(`${slide.confidence.toUpperCase()} CONFIDENCE`, {
      x: 7.4,
      y: 0.28,
      w: 2.1,
      h: 0.28,
      fontSize: 9,
      bold: true,
      color: slide.confidence === 'low' ? 'FFFFFF' : INK,
      align: 'center',
      fill: {
        color:
          slide.confidence === 'high'
            ? '16a34a'
            : slide.confidence === 'medium'
              ? 'd97706'
              : slide.confidence === 'low'
                ? 'dc2626'
                : '94a3b8',
      },
    });
  }
  s.addText(slide.title, {
    x: 0.5,
    y: 0.55,
    w: 9,
    h: 0.45,
    fontSize: 22,
    bold: true,
    color: INK,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.05,
    w: 9,
    h: 0.015,
    fill: { color: RULE },
  });

  renderBlocks(s, slide.blocks, 1.2, pptx);

  s.addText(companyName, {
    x: 0.5,
    y: 5.15,
    w: 6,
    h: 0.25,
    fontSize: 10,
    color: MUTED,
  });
  s.addText(`${index} / ${total}`, {
    x: 7.5,
    y: 5.15,
    w: 2,
    h: 0.25,
    fontSize: 10,
    color: MUTED,
    align: 'right',
  });
}

export async function downloadTearsheetPptx(data: Tearsheet): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const slides = buildSlides(data);
  const pptx = new PptxGenJS() as unknown as PptxApi;
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Quralyst';
  pptx.title = `${data.companyName} Tearsheet`;

  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();

    if (slide.variant === 'title') {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: INK },
      });
      s.addText('QuraLyst', {
        x: 7.2,
        y: 0.35,
        w: 2.3,
        h: 0.35,
        fontSize: 12,
        bold: true,
        color: 'FFFFFF',
        align: 'right',
        transparency: 15,
      });
      if (slide.kicker) {
        s.addText(slide.kicker.toUpperCase(), {
          x: 0.6,
          y: 1.3,
          w: 8.8,
          h: 0.35,
          fontSize: 12,
          color: '93c5fd',
          bold: true,
        });
      }
      s.addText(slide.title, {
        x: 0.6,
        y: 1.7,
        w: 8.8,
        h: 1.1,
        fontSize: 36,
        bold: true,
        color: 'FFFFFF',
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.6,
          y: 2.9,
          w: 8.8,
          h: 1.0,
          fontSize: 16,
          color: 'cbd5e1',
        });
      }
      const meta = [slide.website, slide.meta].filter(Boolean).join('  ·  ');
      if (meta) {
        s.addText(meta, {
          x: 0.6,
          y: 4.5,
          w: 8.8,
          h: 0.35,
          fontSize: 12,
          color: '94a3b8',
        });
      }
      return;
    }

    renderContentSlide(pptx, s, slide, data.companyName, idx + 1, slides.length);
  });

  await pptx.writeFile({ fileName: `${data.companyName.replace(/\s+/g, '_')}_Tearsheet.pptx` });
}
