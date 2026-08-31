import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRaiseIssue } from '@/api/issues.api';
import { useNavigate } from 'react-router-dom';

export default function RaiseIssuePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useRaiseIssue();
  const [formData, setFormData] = React.useState({ assetId: '', title: '', description: '', priority: 'MEDIUM', type: 'BREAKDOWN' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData, { onSuccess: () => navigate('/issues') });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Raise Issue" breadcrumbs={[{ label: 'Issues', href: '/issues' }, { label: 'Raise' }]} />
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="space-y-2">
          <Label>Asset ID / Tag</Label>
          <Input value={formData.assetId} onChange={e => setFormData({ ...formData, assetId: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Issue Title</Label>
          <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <Button type="submit" className="w-full" loading={isPending}>Submit Issue</Button>
      </form>
    </div>
  );
}
