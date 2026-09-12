import React, { useState } from 'react';
import { useDevTeams } from '@/api/devHub.api';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Loader2, Copy, ExternalLink, Trash2 } from 'lucide-react';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'team-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

function generateToken(): string {
  return (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)).substring(0, 32);
}

export default function ManageTeams() {
  const { data: teams, isLoading } = useDevTeams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      await supabase.from('DevTeam').insert([{
        id: generateUUID(),
        name: form.name.trim(),
        publicToken: generateToken(),
        contactEmail: form.contactEmail?.trim() || null,
        contactPhone: form.contactPhone?.trim() || null,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      }]);
      await queryClient.invalidateQueries({ queryKey: ['dev-teams'] });
      setForm({ name: '', contactEmail: '', contactPhone: '' });
    } catch (err) {
      console.error('Failed to add dev team:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/dev-portal/${token}`;
    navigator.clipboard.writeText(url);
    alert('Public Developer Link copied to clipboard!');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await supabase.from('DevTeam').delete().eq('id', id);
      await queryClient.invalidateQueries({ queryKey: ['dev-teams'] });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Vendors</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Vendor / Company Name</label>
              <Input
                placeholder="e.g. Hitachi Payment Services"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Authorized Emails (Comma separated)</label>
              <Input
                placeholder="e.g. manager@hitachi.com, support@hitachi.com"
                value={form.contactEmail}
                onChange={e => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Person / Mobile</label>
              <Input
                placeholder="e.g. John Doe - 9876543210"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={!form.name || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Vendor'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="py-8 text-center text-gray-400 col-span-2">Loading vendors...</div>
        ) : teams?.length === 0 ? (
          <div className="py-8 text-center text-gray-400 col-span-2">No vendors found.</div>
        ) : (
          teams?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-lg mb-2">{t.name}</h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong className="text-gray-700">Contact/Mobile:</strong> {t.contactPhone || 'N/A'}</p>
                    <div>
                      <strong className="text-gray-700 block mb-1">Authorized Emails:</strong>
                      <div className="flex flex-wrap gap-1">
                        {t.contactEmail ? t.contactEmail.split(',').map((e: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{e.trim()}</span>
                        )) : <span className="text-gray-400">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
