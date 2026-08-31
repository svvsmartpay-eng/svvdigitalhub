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

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      resolve();
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('[directPrintEngine] Print execution error:', e);
        }
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 1000);
      }, 350);
    };
  });
}

/**
 * High-Speed Direct Print Engine
 * Directly formats and prints PDFs, Images, and Documents without quality loss
 */
export async function directPrintFiles(
  items: (PrintDocItem | string)[],
  options: {
    colorMode?: 'BW' | 'COLOR';
    copies?: number;
    orientation?: 'PORTRAIT' | 'LANDSCAPE';
    layout?: 'FIT' | 'FILL' | 'PASSPORT_8';
    customerName?: string;
    tokenNumber?: string;
  } = {}
): Promise<boolean> {
  try {
    const normItems: PrintDocItem[] = items.map((it) =>
      typeof it === 'string' ? { url: it, name: 'Document' } : it
    );

    const colorFilter = options.colorMode === 'BW' ? 'grayscale(100%) contrast(120%)' : 'none';
    const orientation = options.orientation || 'PORTRAIT';
    const copies = options.copies || 1;

    let pagesHtml = '';

    for (let c = 0; c < copies; c++) {
      for (const item of normItems) {
        const directUrl = normalizeDocUrl(item.url);
        pagesHtml += `
          <div class="page ${orientation.toLowerCase()}">
            <img src="${directUrl}" style="filter: ${colorFilter};" />
          </div>
        `;
      }
    }

    const printDocHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>SVV Print - ${options.tokenNumber || 'Desk'}</title>
          <style>
            @page {
              size: A4 ${orientation.toLowerCase()};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: sans-serif;
            }
            .page {
              width: 100vw;
              height: 100vh;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .page img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;

    await triggerPrintOnIsolatedFrame(printDocHtml);
    return true;
  } catch (err) {
    console.error('[directPrintEngine] Printing failed:', err);
    return false;
  }
}
