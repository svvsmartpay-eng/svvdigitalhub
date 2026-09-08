import React, { useState } from 'react';
import { useDevCategories } from '@/api/devHub.api';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Loader2 } from 'lucide-react';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

export default function ManageCategories() {
  const { data: categories, isLoading } = useDevCategories();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [group, setGroup] = useState('SERVICE ISSUES');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      await supabase.from('DevIssueCategory').insert([{
        id: generateUUID(),
        name: name.trim(),
        group,
        createdAt: nowIso,
        updatedAt: nowIso
      }]);
      await queryClient.invalidateQueries({ queryKey: ['dev-categories'] });
      setName('');
    } catch (err) {
      console.error('Failed to add category:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Issue Categories" subtitle="Manage issue classification" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 h-fit">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4">Add Category</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block">Group</label>
                <select className="w-full border p-2 rounded" value={group} onChange={e => setGroup(e.target.value)}>
                  <option value="SERVICE ISSUES">SERVICE ISSUES</option>
                  <option value="PORTAL ISSUES">PORTAL ISSUES</option>
                  <option value="REPORTS">REPORTS</option>
                  <option value="OTHERS">OTHERS</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Category Name</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AEPS" />
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Add Category'}</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="p-4">
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b"><th className="pb-2">Group</th><th className="pb-2">Name</th></tr></thead>
                  <tbody>
                    {categories?.map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 text-gray-500 font-medium">{c.group}</td>
                        <td className="py-2 font-bold">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
