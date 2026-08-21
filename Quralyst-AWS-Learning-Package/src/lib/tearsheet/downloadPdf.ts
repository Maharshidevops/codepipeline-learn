// Lazy PDF export for tearsheets (F40.2) — one PDF page per slide, JPEG-compressed.
// Tables are forced to wrap/fit during capture so scrollable overflow never clips.

function prepareSlideForCapture(clonedDoc: Document) {
  clonedDoc
    .querySelectorAll<HTMLElement>('.tearsheet-table-wrap, .table-responsive')
    .forEach((el) => {
      el.style.overflow = 'visible';
      el.style.maxWidth = '100%';
      el.style.width = '100%';
    });
  clonedDoc.querySelectorAll<HTMLElement>('.tearsheet-table, table').forEach((el) => {
    el.style.tableLayout = 'fixed';
    el.style.width = '100%';
    el.style.maxWidth = '100%';
  });
  clonedDoc.querySelectorAll<HTMLElement>('th, td').forEach((el) => {
    el.style.whiteSpace = 'normal';
    el.style.wordBreak = 'break-word';
    el.style.overflowWrap = 'anywhere';
  });
}

export async function downloadTearsheetPdf(
  deckEl: HTMLElement,
  companyName: string,
): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);

  const slides = Array.from(deckEl.querySelectorAll<HTMLElement>('[data-tearsheet-slide]'));
  if (!slides.length) {
    throw new Error('No tearsheet slides found to export');
  }

  // Landscape 16:9 page in points (jsPDF default unit)
  const PAGE_W = 960;
  const PAGE_H = 540;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [PAGE_W, PAGE_H] });

  const previousDisplays = slides.map((el) => el.style.display);
  const previousExporting = deckEl.getAttribute('data-exporting');
  deckEl.setAttribute('data-exporting', 'true');

  try {
    for (let i = 0; i < slides.length; i += 1) {
      slides.forEach((el, j) => {
        el.style.display = j === i ? 'block' : 'none';
      });

      const slide = slides[i]!;
      const canvas = await html2canvas(slide, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Capture full layout height even if the on-screen slide scrolls.
        scrollX: 0,
        scrollY: 0,
        windowWidth: slide.scrollWidth,
        windowHeight: Math.max(slide.scrollHeight, slide.clientHeight),
        onclone: (_doc, clonedEl) => {
          const root = clonedEl.ownerDocument ?? _doc;
          prepareSlideForCapture(root);
          clonedEl.style.overflow = 'visible';
          clonedEl.style.height = 'auto';
          clonedEl.style.maxHeight = 'none';
        },
      });

      // JPEG keeps file size reasonable vs full PNG of padded viewports
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'landscape');

      // Fit the captured slide into the page while preserving aspect ratio.
      const pageRatio = PAGE_W / PAGE_H;
      const imgRatio = canvas.width / canvas.height;
      let drawW = PAGE_W;
      let drawH = PAGE_H;
      let offsetX = 0;
      let offsetY = 0;
      if (imgRatio > pageRatio) {
        drawH = PAGE_W / imgRatio;
        offsetY = (PAGE_H - drawH) / 2;
      } else {
        drawW = PAGE_H * imgRatio;
        offsetX = (PAGE_W - drawW) / 2;
      }
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH, undefined, 'FAST');
    }
  } finally {
    slides.forEach((el, i) => {
      el.style.display = previousDisplays[i] ?? '';
    });
    if (previousExporting == null) deckEl.removeAttribute('data-exporting');
    else deckEl.setAttribute('data-exporting', previousExporting);
  }

  pdf.save(`${companyName.replace(/\s+/g, '_')}_Tearsheet.pdf`);
}
