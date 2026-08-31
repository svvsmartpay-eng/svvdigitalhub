import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateWorkOrder } from '@/api/workOrders.api';
import { useBranches } from '@/api/branches.api';
import { useAssets } from '@/api/assets.api';

export default function WorkOrderFormPage() {
  const navigate = useNavigate();
  const createWO = useCreateWorkOrder();
  const { data: branches, isLoading: isLoadingBranches } = useBranches();
  const { data: assets, isLoading: isLoadingAssets } = useAssets();

  const [formData, setFormData] = useState({
    title: '',
    branchId: '',
    assetId: '',
    priority: 'MEDIUM',
    estimatedCost: 0,
    description: ''
  });
  
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await createWO.mutateAsync(formData);
      navigate('/work-orders');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create work order');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Create Work Order" subtitle="Issue a new work order for maintenance or repair" />
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Work Order Title *</Label>
            <Input id="title" name="title" required value={formData.title} onChange={handleChange} placeholder="Brief summary of the work required" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Branch *</Label>
            <select 
              id="branchId" 
              name="branchId" 
              required 
              value={formData.branchId} 
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            >
              <option value="">Select Branch</option>
              {!isLoadingBranches && branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetId">Affected Asset (Optional)</Label>
            <select 
              id="assetId" 
              name="assetId" 
              value={formData.assetId} 
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            >
              <option value="">None / General Maintenance</option>
              {!isLoadingAssets && assets?.map((a: any) => {
                if (formData.branchId && a.branchId !== formData.branchId) return null;
                return <option key={a.id} value={a.id}>{a.name} ({a.assetId})</option>;
              })}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select 
              id="priority" 
              name="priority" 
              value={formData.priority} 
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost</Label>
            <Input id="estimatedCost" name="estimatedCost" type="number" min="0" step="0.01" value={formData.estimatedCost} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description *</Label>
          <Textarea id="description" name="description" required value={formData.description} onChange={handleChange} rows={5} placeholder="Provide as much detail as possible about the work to be done..." />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/work-orders')}>Cancel</Button>
          <Button type="submit" loading={createWO.isPending}>Create Work Order</Button>
        </div>
      </form>
    </div>
  );
}
