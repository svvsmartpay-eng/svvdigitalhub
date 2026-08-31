import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import LoadingSpinner from './LoadingSpinner';
import { FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ContinuousPdfViewerProps {
  url: string;
  zoom?: number; // scale percentage (e.g. 100 for 100%)
  rotation?: number; // rotation in degrees (0, 90, 180, 270)
  onPageCountChange?: (count: number) => void;
  className?: string;
}

interface PageData {
  pageNum: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export default function ContinuousPdfViewer({
  url,
  zoom = 100,
  rotation = 0,
  onPageCountChange,
  className = '',
}: ContinuousPdfViewerProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!url) {
      setPages([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const cleanUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')
      ? url
      : `http://localhost:4000${url.startsWith('/') ? url : `/${url}`}`;

    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: cleanUrl, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const totalPages = pdf.numPages || 1;
        setPageCount(totalPages);
        onPageCountChange?.(totalPages);

        const renderedPages: PageData[] = [];

        for (let p = 1; p <= totalPages; p++) {
          if (isCancelled) return;
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.8 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            renderedPages.push({
              pageNum: p,
              canvas,
              width: viewport.width,
              height: viewport.height,
            });
          }
        }

        if (!isCancelled) {
          setPages(renderedPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[ContinuousPdfViewer] Error rendering PDF:', err);
        if (!isCancelled) {
          setError('Failed to load PDF document pages.');
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px] text-[#6B7280]">
        <LoadingSpinner size="md" />
        <p className="mt-3 text-xs font-semibold">Loading all PDF pages...</p>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px] text-center text-[#6B7280]">
        <FileText className="w-10 h-10 text-[#CBD5E1] mb-2" />
        <p className="text-xs font-semibold text-[#081B3A]">Document Preview</p>
        <p className="text-[11px] text-[#6B7280] mt-1">{error || 'No pages available for preview'}</p>
      </div>
    );
  }

  const scaleFactor = (zoom / 100);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-y-auto overflow-x-auto p-4 flex flex-col items-center gap-6 ${className}`}
    >
      {pages.map((p) => {
        const dataUrl = p.canvas.toDataURL('image/png');
        return (
          <div
            key={p.pageNum}
            className="flex flex-col items-center group transition-transform"
            style={{
              transform: `scale(${scaleFactor}) rotate(${rotation}deg)`,
              transformOrigin: 'top center',
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Page Header Tag */}
            <div className="w-full flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-mono text-[#6B7280]">
              <span className="font-bold text-[#0D6EFD] bg-[#E7F1FF] px-2 py-0.5 rounded-md border border-[#B6D4FE]">
                Page {p.pageNum} of {pageCount}
              </span>
              <span className="text-[10px] text-[#9CA3AF]">A4 Document</span>
            </div>

            {/* Rendered Page Sheet */}
            <div className="bg-[#FFFFFF] rounded-xl shadow-md border border-[#CBD5E1] p-1 overflow-hidden">
              <img
                src={dataUrl}
                alt={`Page ${p.pageNum}`}
                className="max-h-[75vh] max-w-full object-contain rounded-lg block"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
