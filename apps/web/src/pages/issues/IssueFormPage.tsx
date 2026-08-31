import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRaiseIssue } from '@/api/issues.api';
import { useAssets } from '@/api/assets.api';
import { useBranches } from '@/api/branches.api';

export default function IssueFormPage() {
  const navigate = useNavigate();
  const raiseIssue = useRaiseIssue();
  const { data: branches, isLoading: isLoadingBranches } = useBranches();
  const { data: assets, isLoading: isLoadingAssets } = useAssets();

  const [formData, setFormData] = useState({
    title: '',
    branchId: '',
    assetId: '',
    priority: 'MEDIUM',
    category: 'HARDWARE',
    description: ''
  });
  
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await raiseIssue.mutateAsync(formData);
      navigate('/issues');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to raise issue');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Raise Issue" subtitle="Report a new problem or breakdown" />
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input id="title" name="title" required value={formData.title} onChange={handleChange} placeholder="Brief summary of the problem" />
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
              <option value="">None / General Issue</option>
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
            <Label htmlFor="category">Category</Label>
            <select 
              id="category" 
              name="category" 
              value={formData.category} 
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
            >
              <option value="HARDWARE">Hardware Failure</option>
              <option value="SOFTWARE">Software / OS</option>
              <option value="NETWORK">Network / Connectivity</option>
              <option value="POWER">Power / Electrical</option>
              <option value="PHYSICAL_DAMAGE">Physical Damage</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description *</Label>
          <Textarea id="description" name="description" required value={formData.description} onChange={handleChange} rows={5} placeholder="Provide as much detail as possible..." />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/issues')}>Cancel</Button>
          <Button type="submit" loading={raiseIssue.isPending}>Submit Issue</Button>
        </div>
      </form>
    </div>
  );
}
