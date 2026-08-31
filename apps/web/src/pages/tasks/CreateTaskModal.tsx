import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, CheckSquare, Calendar, Building2, User, AlertCircle,
  Paperclip, Upload, Sparkles, Check
} from 'lucide-react';
import { useCreateTask } from '@/api/tasks.api';
import { useUsers } from '@/api/users.api';
import { useBranches } from '@/api/branches.api';
import { useAuthStore } from '@/stores/auth.store';

interface CreateTaskModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateTaskModal({ onClose, onSuccess }: CreateTaskModalProps) {
  const { user } = useAuthStore();
  const { data: users } = useUsers();
  const { data: branches } = useBranches();
  const createTask = useCreateTask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedToId: '',
    branchId: '',
    dueDate: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Please provide a task title.');
      return;
    }
    if (!formData.assignedToId) {
      setError('Please select an assignee.');
      return;
    }

    try {
      await createTask.mutateAsync({
        ...formData,
        attachments,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create task');
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 animate-in fade-in duration-150" />
        <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[92vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl z-50 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-5">
            <div>
              <Dialog.Title className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#1e3a5f]" />
                Create Internal Task / Work Assignment
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign operational work, audits, reports, follow-ups, or branch activities to any team member.
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-3.5 rounded-xl border border-red-200 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Title */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Task Title *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. August Branch Cash & Asset Audit, Order Printer Toners..."
                required
                className="text-xs font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Detailed Instructions / Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide clear instructions, checklist points, expectations, or reference details..."
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Priority Level</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="CRITICAL">🔴 CRITICAL (Immediate Action)</option>
                  <option value="HIGH">🟠 HIGH (Priority Assignment)</option>
                  <option value="MEDIUM">🟡 MEDIUM (Normal Priority)</option>
                  <option value="LOW">🟢 LOW (Routine / Flexible)</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Target Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Assigned To */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Assign To Team Member *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={formData.assignedToId}
                  onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
                  required
                >
                  <option value="">Select Assignee...</option>
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.designation || u.roleNames || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Associated Branch</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={formData.branchId}
                  onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                >
                  <option value="">Cross-Branch / General (HQ)</option>
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold text-gray-700">Upload Reference Files / Guidelines (Optional)</Label>
              <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/60 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  multiple
                  id="task-files"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="task-files" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-600 font-medium">Click to upload documents or images</span>
                  <span className="text-[10px] text-gray-400">PDF, Excel, Word, PNG, JPG (Max 5 files)</span>
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {attachments.map((f, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 mt-5">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-5 h-9"
                loading={createTask.isPending}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Create & Assign Task
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
