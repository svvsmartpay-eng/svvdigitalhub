import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateDevIssue, useDevTeams } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/ui/RichTextEditor';
import {
  AlertCircle, CheckCircle2, Loader2, Upload, X, FileText, Film, ImageIcon, Users
} from 'lucide-react';

// ── Attachment preview item ──────────────────────────────────
function AttachmentPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl] = useState(() => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      return URL.createObjectURL(file);
    }
    return null;
  });

  const Icon = file.type.startsWith('image/') ? ImageIcon
    : file.type.startsWith('video/') ? Film : FileText;

  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex flex-col items-center">
      {previewUrl && file.type.startsWith('image/') && (
        <img src={previewUrl} alt={file.name} className="w-full h-20 object-cover" />
      )}
      {previewUrl && file.type.startsWith('video/') && (
        <video src={previewUrl} className="w-full h-20 object-cover" />
      )}
      {!previewUrl && (
        <div className="w-full h-20 flex items-center justify-center bg-gray-100">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <p className="text-[10px] text-gray-600 px-1 py-1 text-center truncate w-full">
        {file.name}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5 text-gray-600" />
      </button>
    </div>
  );
}

// ── Priority option card ─────────────────────────────────────
function PriorityCard({
  value, label, color, selected, onClick,
}: {
  value: string; label: string; color: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-bold transition-all ${
        selected ? `border-current bg-current/10 ${color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CreateIssuePage() {
  const navigate = useNavigate();
  const createMutation = useCreateDevIssue();
  const { data: vendors } = useDevTeams();
  const dropRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── File handling
  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const unique = newFiles.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...unique].slice(0, 10); // max 10 files
    });
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = ''; // reset so same file can be re-added
  };

  // ── Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Please enter a ticket title.'); return; }
    if (!assignedTeamId) { setError('Please select a vendor.'); return; }

    setError(null);
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description,
        priority,
        assignedTeamId,
        attachmentFiles: files,
      });
      setSuccess(true);
      setTimeout(() => navigate('/settings/dev-hub'), 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to create ticket. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Create Ticket" subtitle="Report a bug, task, or feature request" />

      <Card>
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Ticket created! Redirecting…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Vendor Selector */}
            <div>
              <label className="block text-sm font-bold mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                Select Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedTeamId}
                onChange={e => setAssignedTeamId(e.target.value)}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
                required
              >
                <option value="" disabled>-- Select a Vendor --</option>
                {vendors?.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold mb-1.5">
                Ticket Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Short summary of the issue…"
                className="text-base"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-bold mb-2">Priority</label>
              <div className="flex gap-2">
                <PriorityCard value="LOW" label="🟢 Low" color="text-green-600" selected={priority === 'LOW'} onClick={() => setPriority('LOW')} />
                <PriorityCard value="MEDIUM" label="🟡 Medium" color="text-yellow-600" selected={priority === 'MEDIUM'} onClick={() => setPriority('MEDIUM')} />
                <PriorityCard value="HIGH" label="🟠 High" color="text-orange-600" selected={priority === 'HIGH'} onClick={() => setPriority('HIGH')} />
                <PriorityCard value="CRITICAL" label="🔴 Critical" color="text-red-600" selected={priority === 'CRITICAL'} onClick={() => setPriority('CRITICAL')} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the issue — steps to reproduce, environment, screenshots needed…"
                minHeight="140px"
              />
            </div>

            {/* Attachment Upload */}
            <div>
              <label className="block text-sm font-bold mb-1.5">
                Attachments <span className="text-gray-400 font-normal">(Images, Videos, PDFs — max 10 files)</span>
              </label>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600 font-medium">
                  {isDragging ? 'Drop files here…' : 'Drag & drop files or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Images · Videos · PDFs · Documents</p>

                {/* Mobile camera capture */}
                <div className="flex justify-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <label className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Gallery
                    <input id="file-input" type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx" className="hidden" onChange={handleFileInput} />
                  </label>
                  <label className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Camera
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                  </label>
                </div>
              </div>

              {/* Preview grid */}
              {files.length > 0 && (
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {files.map((file, i) => (
                    <AttachmentPreview
                      key={`${file.name}-${i}`}
                      file={file}
                      onRemove={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/settings/dev-hub')}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                ) : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
