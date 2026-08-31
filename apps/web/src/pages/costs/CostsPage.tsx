import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useCosts, useCreateCost } from '@/api/costs.api';
import DataTable from '@/components/shared/DataTable';
import { IndianRupee, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CostsPage() {
  const { data: response, isLoading } = useCosts();
  const createMutation = useCreateCost();
  const costs = response || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ categoryType: 'other', amount: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { ...formData, amount: Number(formData.amount) },
      { onSuccess: () => { setIsModalOpen(false); setFormData({ categoryType: 'other', amount: '', description: '' }); } }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cost Management" 
        actions={<Button onClick={() => setIsModalOpen(true)}><IndianRupee className="w-4 h-4 mr-2" /> Add Cost Entry</Button>}
      />
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <DataTable
          columns={[
            { key: 'recordedAt', header: 'Date', render: (row: any) => new Date(row.recordedAt || row.createdAt).toLocaleDateString() },
            { key: 'categoryType', header: 'Category', render: (row: any) => <span className="capitalize">{row.categoryType}</span> },
            { key: 'description', header: 'Description' },
            { key: 'amount', header: 'Amount', render: (row: any) => `₹${Number(row.amount).toLocaleString()}` },
          ]}
          data={costs}
          loading={isLoading}
          emptyMessage="No cost entries found."
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Cost Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={formData.categoryType} onChange={e => setFormData({ ...formData, categoryType: e.target.value })} required>
                  <option value="labour">Labour</option>
                  <option value="parts">Parts</option>
                  <option value="travel">Travel</option>
                  <option value="amc">AMC</option>
                  <option value="rental">Rental</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Save Entry</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
