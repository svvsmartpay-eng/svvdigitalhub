import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { FileText, Download, AlertCircle, ZoomIn, ZoomOut, RotateCw, Printer } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface WordDocumentViewerProps {
  url: string;
  documentName?: string;
  zoom?: number;
  className?: string;
  onPageCountChange?: (pages: number) => void;
  onPrint?: () => void;
}

export default function WordDocumentViewer({
  url,
  documentName,
  zoom: externalZoom,
  className = '',
  onPageCountChange,
  onPrint,
}: WordDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [internalZoom, setInternalZoom] = useState<number>(1.0);
  const [pageCount, setPageCount] = useState<number>(1);

  const currentZoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const normalizedUrl = React.useMemo(() => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const clean = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:4000${clean}`;
  }, [url]);

  useEffect(() => {
    let isCancelled = false;

    async function loadDocx() {
      if (!normalizedUrl) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(normalizedUrl, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to fetch document: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';

        await docx.renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-preview-content',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (isCancelled) return;

        // Detect rendered pages (sections in docx-preview)
        const sections = containerRef.current.querySelectorAll('.docx-preview-content section, .docx-preview-content > div');
        const count = Math.max(1, sections.length);
        setPageCount(count);
        if (onPageCountChange) {
          onPageCountChange(count);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('[WordDocumentViewer] Error rendering docx:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to render Word document preview from file bytes.');
          setLoading(false);
        }
      }
    }

    loadDocx();

    return () => {
      isCancelled = true;
    };
  }, [normalizedUrl, onPageCountChange]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = normalizedUrl;
    a.download = documentName || 'Document.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`flex flex-col h-full bg-[#E2E8F0] select-text relative overflow-hidden rounded-xl ${className}`}>
      {/* Viewer Header / Toolbar */}
      <div className="h-10 bg-[#FFFFFF] border-b border-[#CBD5E1] px-3 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-2 truncate">
          <span className="p-1 rounded bg-[#EFF6FF] text-[#1D4ED8] font-bold text-xs flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Word (.docx)
          </span>
          <span className="text-xs font-bold text-[#081B3A] truncate max-w-[200px]" title={documentName || 'Document.docx'}>
            {documentName || 'Document.docx'}
          </span>
          <span className="text-[10px] font-mono text-[#6B7280] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
            {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setInternalZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 rounded hover:bg-[#E2E8F0] text-[#081B3A] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold text-[#081B3A] px-1">
              {Math.round(currentZoom * 100)}%
            </span>
            <button
              onClick={() => setInternalZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 rounded hover:bg-[#E2E8F0] text-[#081B3A] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onPrint && (
            <button
              onClick={onPrint}
              className="px-2.5 py-1 rounded-lg bg-[#FD7E14] hover:bg-[#E86D07] text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Print Word Document"
            >
              <Printer className="w-3 h-3" /> Print
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white cursor-pointer shadow-2xs"
            title="Download Original File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 flex justify-center bg-[#F1F5F9] relative">
        {loading && (
          <div className="absolute inset-0 bg-[#F1F5F9]/80 flex flex-col items-center justify-center gap-3 z-20">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-bold text-[#081B3A]">Rendering Word Document Pages...</p>
          </div>
        )}

        {error ? (
          <div className="m-auto bg-[#FFFFFF] p-6 rounded-2xl border border-[#CBD5E1] shadow-md max-w-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FFF4EC] text-[#EA580C] flex items-center justify-center mx-auto border border-[#FDBA74]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#081B3A]">Direct Preview Unavailable</h4>
            <p className="text-xs text-[#6B7280]">
              The file bytes could not be decoded in browser. You can open or download the original file directly.
            </p>
            <button
              onClick={handleDownload}
              className="w-full py-2.5 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Original {documentName || 'Document'}
            </button>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${currentZoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.1s ease-out',
            }}
            className="w-full max-w-[850px] shadow-lg rounded-md bg-[#FFFFFF] min-h-[900px]"
          >
            <div
              ref={containerRef}
              className="docx-viewer-inner p-6 sm:p-10 font-sans text-left text-[#111827]"
            />
          </div>
        )}
      </div>

      {/* Scoped CSS for authentic Microsoft Word / WPS layout styling */}
      <style>{`
        .docx-preview-content {
          background-color: transparent !important;
          padding: 0 !important;
        }
        .docx-preview-content section {
          background: #FFFFFF !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
          margin-bottom: 24px !important;
          border-radius: 4px !important;
          box-sizing: border-box !important;
        }
        .docx-preview-content table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        .docx-preview-content td, .docx-preview-content th {
          border: 1px solid #CBD5E1 !important;
          padding: 6px 10px !important;
        }
      `}</style>
    </div>
  );
}
