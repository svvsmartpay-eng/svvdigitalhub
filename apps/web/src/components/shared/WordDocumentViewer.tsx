import React, { useEffect, useRef, useState } from "react";
import * as docx from "docx-preview";
import { FileText, Download, AlertCircle, ZoomIn, ZoomOut, Printer } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

interface WordDocumentViewerProps {
  url: string;
  documentName?: string;
  zoom?: number;
  className?: string;
  onPageCountChange?: (pages: number) => void;
  onPrint?: () => void;
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function detectDocKind(url: string, name?: string): "word" | "excel" | "pdf" | "text" | "unknown" {
  const lUrl = (url || "").toLowerCase();
  const lName = (name || "").toLowerCase();
  if (url.startsWith("data:")) {
    const mime = url.slice(5, url.indexOf(";"));
    if (mime === "application/pdf") return "pdf";
    if (mime.includes("spreadsheet") || mime.includes("ms-excel") || mime === "text/csv") return "excel";
    if (mime.includes("wordprocessing") || mime === "application/msword") return "word";
    if (mime === "text/plain") return "text";
  }
  if (lUrl.endsWith(".pdf") || lName.endsWith(".pdf")) return "pdf";
  if ([".xlsx",".xls",".csv"].some(e => lUrl.endsWith(e) || lName.endsWith(e))) return "excel";
  if ([".docx",".doc",".rtf"].some(e => lUrl.endsWith(e) || lName.endsWith(e))) return "word";
  if (lUrl.endsWith(".txt") || lName.endsWith(".txt")) return "text";
  return "unknown";
}

export default function WordDocumentViewer({ url, documentName, zoom: externalZoom, className = "", onPageCountChange, onPrint }: WordDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalZoom, setInternalZoom] = useState(1.0);
  const [pageCount, setPageCount] = useState(1);
  const [excelHtml, setExcelHtml] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const currentZoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const docKind = detectDocKind(url, documentName);

  const normalizedUrl = React.useMemo(() => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    const clean = url.startsWith("/") ? url : `/${url}`;
    return `http://localhost:4000${clean}`;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setExcelHtml(null); setPdfBlobUrl(null); setTextContent(null);

    async function load() {
      if (!normalizedUrl) { setLoading(false); return; }
      try {
        let buf: ArrayBuffer;
        if (normalizedUrl.startsWith("data:")) {
          buf = dataUrlToArrayBuffer(normalizedUrl);
        } else {
          const r = await fetch(normalizedUrl, { mode: "cors" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          buf = await r.arrayBuffer();
        }
        if (cancelled) return;

        if (docKind === "pdf") {
          const blob = new Blob([buf], { type: "application/pdf" });
          const bUrl = URL.createObjectURL(blob);
          if (!cancelled) { setPdfBlobUrl(bUrl); setLoading(false); onPageCountChange?.(1); }
          return;
        }

        if (docKind === "excel") {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buf, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const html = XLSX.utils.sheet_to_html(ws, { id: "xlsx-tbl", header: "", footer: "" });
          if (!cancelled) {
            setExcelHtml(html);
            setPageCount(wb.SheetNames.length);
            onPageCountChange?.(wb.SheetNames.length);
            setLoading(false);
          }
          return;
        }

        if (docKind === "text") {
          const text = new TextDecoder().decode(buf);
          if (!cancelled) { setTextContent(text); setLoading(false); onPageCountChange?.(1); }
          return;
        }

        // Word docx
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";
        await docx.renderAsync(buf, containerRef.current, undefined, {
          className: "docx-preview-content", inWrapper: true, ignoreWidth: false,
          ignoreHeight: false, ignoreFonts: false, breakPages: true,
          renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true,
        });
        if (cancelled) return;
        const sects = containerRef.current.querySelectorAll(".docx-preview-content section, .docx-preview-content > div");
        const cnt = Math.max(1, sects.length);
        setPageCount(cnt); onPageCountChange?.(cnt); setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setError(e.message || "Failed to render document."); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [normalizedUrl, docKind]);

  useEffect(() => { return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); }; }, [pdfBlobUrl]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = normalizedUrl; a.download = documentName || "Document";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const kindLabel = docKind === "pdf" ? "PDF Document" : docKind === "excel" ? "Excel Spreadsheet" : docKind === "text" ? "Text File" : "Word Document";
  const kindColor = docKind === "pdf" ? "bg-[#FFF0F0] text-[#DC2626]" : docKind === "excel" ? "bg-[#F0FFF4] text-[#15803D]" : "bg-[#EFF6FF] text-[#1D4ED8]";

  return (
    <div className={`flex flex-col h-full bg-[#E2E8F0] select-text relative overflow-hidden rounded-xl ${className}`}>
      <div className="h-10 bg-white border-b border-[#CBD5E1] px-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 truncate">
          <span className={`p-1 rounded font-bold text-xs flex items-center gap-1 ${kindColor}`}>
            <FileText className="w-3.5 h-3.5" />{kindLabel}
          </span>
          <span className="text-xs font-bold text-[#081B3A] truncate max-w-[180px]">{documentName || "Document"}</span>
          {pageCount > 1 && <span className="text-[10px] font-mono text-[#6B7280] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{pageCount} {docKind === "excel" ? "Sheets" : "Pages"}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {docKind !== "pdf" && (
            <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-0.5">
              <button onClick={() => setInternalZoom(z => Math.max(0.5, z - 0.15))} className="p-1 rounded hover:bg-[#E2E8F0] cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="font-mono text-[11px] font-bold text-[#081B3A] px-1">{Math.round(currentZoom * 100)}%</span>
              <button onClick={() => setInternalZoom(z => Math.min(2.5, z + 0.15))} className="p-1 rounded hover:bg-[#E2E8F0] cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {onPrint && <button onClick={onPrint} className="px-2.5 py-1 rounded-lg bg-[#FD7E14] hover:bg-[#E86D07] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><Printer className="w-3 h-3" /> Print</button>}
          <button onClick={handleDownload} className="p-1.5 rounded-lg bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white cursor-pointer"><Download className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative flex flex-col">
        {loading && (
          <div className="absolute inset-0 bg-[#F1F5F9]/90 flex flex-col items-center justify-center gap-3 z-20">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-bold text-[#081B3A]">Loading {kindLabel}...</p>
          </div>
        )}
        {!loading && error && (
          <div className="m-auto bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-md max-w-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FFF4EC] text-[#EA580C] flex items-center justify-center mx-auto"><AlertCircle className="w-6 h-6" /></div>
            <h4 className="text-sm font-bold text-[#081B3A]">Preview Unavailable</h4>
            <p className="text-xs text-[#6B7280]">{error}</p>
            <button onClick={handleDownload} className="w-full py-2.5 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"><Download className="w-4 h-4" /> Download {documentName || "Document"}</button>
          </div>
        )}
        {!loading && !error && docKind === "pdf" && pdfBlobUrl && (
          <iframe src={pdfBlobUrl} className="w-full flex-1 border-0 min-h-[600px]" title={documentName || "PDF Preview"} />
        )}
        {!loading && !error && docKind === "excel" && excelHtml && (
          <div className="flex-1 overflow-auto p-4 bg-[#F8FAFC]">
            <div style={{ transform: `scale(${currentZoom})`, transformOrigin: "top left", transition: "transform 0.1s", minWidth: "max-content" }}>
              <div className="bg-white shadow rounded-xl overflow-auto" dangerouslySetInnerHTML={{ __html: excelHtml }} />
            </div>
          </div>
        )}
        {!loading && !error && docKind === "text" && textContent !== null && (
          <div className="flex-1 overflow-auto p-6 bg-white">
            <pre style={{ transform: `scale(${currentZoom})`, transformOrigin: "top left" }} className="text-xs font-mono text-[#111827] whitespace-pre-wrap break-words">{textContent}</pre>
          </div>
        )}
        {!loading && !error && docKind === "word" && (
          <div className="flex-1 overflow-auto p-4 flex justify-center bg-[#F1F5F9]">
            <div style={{ transform: `scale(${currentZoom})`, transformOrigin: "top center", transition: "transform 0.1s" }} className="w-full max-w-[850px] shadow-lg rounded-md bg-white min-h-[900px]">
              <div ref={containerRef} className="docx-viewer-inner p-6 sm:p-10 font-sans text-left text-[#111827]" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        #xlsx-tbl { border-collapse: collapse; width: 100%; font-size: 12px; }
        #xlsx-tbl td, #xlsx-tbl th { border: 1px solid #CBD5E1; padding: 5px 10px; white-space: nowrap; }
        #xlsx-tbl tr:nth-child(even) { background: #F8FAFC; }
        #xlsx-tbl tr:first-child td { background: #1E3A5F; color: white; font-weight: bold; }
        .docx-preview-content { background: transparent !important; padding: 0 !important; }
        .docx-preview-content section { background: #fff !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; margin-bottom: 24px !important; }
        .docx-preview-content table { border-collapse: collapse !important; width: 100% !important; }
        .docx-preview-content td, .docx-preview-content th { border: 1px solid #CBD5E1 !important; padding: 6px 10px !important; }
      `}</style>
    </div>
  );
}
