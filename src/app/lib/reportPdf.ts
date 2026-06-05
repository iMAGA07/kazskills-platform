// Render an HTML string to a multi-page A4 PDF (lazy-loads jspdf + html2canvas).
// Optional clickable link regions are mapped from CSS selectors to PDF coords,
// so e.g. a login URL in the credentials report stays tappable on a phone.

export interface PdfLink { selector: string; url: string; }

export async function htmlToPdf(html: string, filename: string, links: PdfLink[] = []): Promise<void> {
  const [{ jsPDF }, h2cMod] = await Promise.all([import('jspdf'), import('html2canvas')]);
  const html2canvas = (h2cMod as any).default ?? h2cMod;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
  host.innerHTML = html;
  document.body.appendChild(host);
  const node = host.firstElementChild as HTMLElement;

  try {
    const nodeRect = node.getBoundingClientRect();
    const cssW = node.clientWidth || nodeRect.width;

    // Measure link regions in CSS px relative to the node.
    const linkRegions = links.map(l => {
      const el = node.querySelector(l.selector) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { url: l.url, x: r.left - nodeRect.left, y: r.top - nodeRect.top, w: r.width, h: r.height };
    }).filter(Boolean) as { url: string; x: number; y: number; w: number; h: number }[];

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgW = pageW - margin * 2;
    const mmPerCssPx = imgW / cssW;            // CSS px → mm
    const pageContentHmm = pageH - margin * 2;
    const pageContentCssPx = pageContentHmm / mmPerCssPx;
    const scale = canvas.width / cssW;         // canvas px per CSS px (≈2)

    const totalCssH = canvas.height / scale;
    const pageCount = Math.max(1, Math.ceil(totalCssH / pageContentCssPx));

    for (let p = 0; p < pageCount; p++) {
      if (p > 0) pdf.addPage();

      const sliceCssTop = p * pageContentCssPx;
      const sliceCssH = Math.min(pageContentCssPx, totalCssH - sliceCssTop);

      // Cut the page slice out of the full canvas.
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.round(sliceCssH * scale);
      const sctx = slice.getContext('2d')!;
      sctx.drawImage(canvas, 0, Math.round(sliceCssTop * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      const img = slice.toDataURL('image/jpeg', 0.95);
      pdf.addImage(img, 'JPEG', margin, margin, imgW, sliceCssH * mmPerCssPx);

      // Add link annotations that fall on this page.
      for (const lk of linkRegions) {
        if (lk.y >= sliceCssTop && lk.y < sliceCssTop + sliceCssH) {
          const x = margin + lk.x * mmPerCssPx;
          const y = margin + (lk.y - sliceCssTop) * mmPerCssPx;
          const w = lk.w * mmPerCssPx;
          const h = lk.h * mmPerCssPx;
          (pdf as any).link(x, y, w, h, { url: lk.url });
        }
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}
