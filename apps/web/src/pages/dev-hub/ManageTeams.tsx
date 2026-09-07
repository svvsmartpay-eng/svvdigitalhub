
import React, { useState } from 'react';
import { useDevTeams } from '@/api/devHub.api';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Loader2, Copy, ExternalLink } from 'lucide-react';

export default function ManageTeams() {
  const { data: teams, isLoading } = useDevTeams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiClient.post('/dev-hub/admin/teams', form);
    await queryClient.invalidateQueries({ queryKey: ['dev-teams'] });
    setForm({ name: '', contactEmail: '', contactPhone: '' });
    setSaving(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/dev-portal/${token}`;
    navigator.clipboard.writeText(url);
    alert('Public Developer Link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Developer Teams" subtitle="Manage external dev agencies & generate public links" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 h-fit">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4">Add Developer Team</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block">Team / Company Name</label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. CodeCrafters Inc" />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Contact Email (Optional)</label>
                <Input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Contact Phone (Optional)</label>
                <Input value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Add Team'}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="col-span-2 space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : teams?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{t.name}</h4>
                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>Email: {t.contactEmail || 'N/A'}</span>
                    <span>Phone: {t.contactPhone || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyLink(t.publicToken)}>
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>
                  <Button size="sm" onClick={() => window.open(`/dev-portal/${t.publicToken}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" /> Open Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
