import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PrintDocItem {
  url: string;
  type?: string;
  name?: string;
}

/**
 * Normalizes backend / relative URLs to full accessible URLs
 */
function normalizeDocUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const cleanRel = url.startsWith('/') ? url : `/${url}`;
  return `http://localhost:4000${cleanRel}`;
}

/**
 * Renders all pages of a PDF into high-res image data URLs
 */
async function extractPdfPagesAsImages(pdfUrl: string): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 1;
    const pageImages: string[] = [];

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        pageImages.push(canvas.toDataURL('image/png'));
      }
    }
    return pageImages;
  } catch (err) {
    console.error('[directPrintEngine] Error extracting PDF pages:', err);
    return [];
  }
}

/**
 * Triggers clean browser print on an isolated hidden iframe or popup window
 */
function triggerPrintOnIsolatedFrame(htmlContent: string): Promise<void> {
  return new Promise((resolve) => {
    // Remove any previous print iframes
    const oldFrame = document.getElementById('svv-direct-print-iframe');
    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'svv-direct-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      // Fallback to popup window if iframe document is unavailable
      const printWin = window.open('', '_blank', 'width=980,height=780');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
      }
      resolve();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give browser time to load images in the iframe before printing
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('[directPrintEngine] iframe print error:', e);
      }
      setTimeout(() => {
        iframe.remove();
        resolve();
      }, 2000);
    }, 400);
  });
}

/**
 * Direct Print ONLY the specified document/files without any application UI
 */
export async function directPrintFiles(
  items: PrintDocItem | PrintDocItem[],
  tokenNumber: string = 'Document',
  options: { orientation?: 'portrait' | 'landscape'; margin?: string } = {}
): Promise<void> {
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return;

  const orientation = options.orientation || 'portrait';
  const allPageImages: string[] = [];

  for (const item of list) {
    if (!item.url) continue;
    const fullUrl = normalizeDocUrl(item.url);
    const isPdf = item.type === 'PDF' || item.url.toLowerCase().endsWith('.pdf') || (item.name && item.name.toLowerCase().endsWith('.pdf'));

    if (isPdf) {
      const pdfPages = await extractPdfPagesAsImages(fullUrl);
      if (pdfPages.length > 0) {
        allPageImages.push(...pdfPages);
      } else {
        // Fallback to direct URL if image extraction failed
        allPageImages.push(fullUrl);
      }
    } else {
      allPageImages.push(fullUrl);
    }
  }

  if (allPageImages.length === 0) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SVV Print Desk - ${tokenNumber}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 100%;
            height: 100%;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #ffffff;
            padding: 5mm;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          .print-page img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
          }
          @media screen {
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
              background: #f1f5f9;
              padding: 20px;
            }
            .print-page {
              width: 210mm;
              height: 297mm;
              background: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
          }
        </style>
      </head>
      <body>
        ${allPageImages
          .map(
            (imgSrc) => `
          <div class="print-page">
            <img src="${imgSrc}" alt="Page" />
          </div>
        `
          )
          .join('')}
      </body>
    </html>
  `;

  await triggerPrintOnIsolatedFrame(htmlContent);
}
