import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { FileText, ExternalLink, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContinuousPdfViewerProps {
  url: string;
  zoom?: number;
  rotation?: number;
  onPageCountChange?: (count: number) => void;
  className?: string;
}

export default function ContinuousPdfViewer({
  url,
  zoom = 100,
  rotation = 0,
  onPageCountChange,
  className = '',
}: ContinuousPdfViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px] text-center text-[#6B7280]">
        <FileText className="w-10 h-10 text-[#CBD5E1] mb-2" />
        <p className="text-xs font-semibold text-[#081B3A]">No PDF Document Selected</p>
      </div>
    );
  }

  const cleanUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')
    ? url
    : `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80`;

  return (
    <div className={`relative w-full h-full min-h-[480px] bg-gray-100 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Top Toolbar */}
      <div className="bg-[#081B3A] text-white px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">PDF Document Viewer</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-300 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Full Screen
          </a>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 relative w-full h-full bg-slate-900/5">
        <iframe
          src={`${cleanUrl}#toolbar=1&navpanes=0`}
          title="PDF Document Preview"
          className="w-full h-full min-h-[480px] border-0"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}
