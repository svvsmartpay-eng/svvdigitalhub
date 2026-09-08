import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevCategories, useDevTeams, useCreateDevIssue } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function CreateIssuePage() {
  const navigate = useNavigate();
  const { data: categories, isLoading: isCategoriesLoading } = useDevCategories();
  const { data: teams } = useDevTeams();
  const createMutation = useCreateDevIssue();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'MEDIUM',
    expectedResult: '',
    currentResult: '',
    assignedTeamId: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fallbackCatId = formData.categoryId || categories?.[0]?.id || '';

    const payload = {
      ...formData,
      title: formData.title.trim() || 'Untitled Issue',
      description: formData.description.trim() || 'No description provided',
      categoryId: fallbackCatId,
    };

    try {
      await createMutation.mutateAsync(payload);
      setSuccessMessage('Ticket created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/settings/dev-hub');
      }, 400);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setErrorMessage(err?.message || 'Failed to create ticket. Please check connection and try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Create Developer Issue" subtitle="Log a new task, bug, or feature request. All fields are optional." />
      
      <Card>
        <CardContent className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Issue Title (Optional)</label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Short summary of the issue (or leave blank for Untitled)" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Category (Optional)</label>
                <select 
                  className="w-full p-2 border rounded-md bg-white" 
                  value={formData.categoryId} 
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                >
                  <option value="">
                    {isCategoriesLoading ? 'Loading categories...' : 'Auto / First Category'}
                  </option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.group ? `${c.group} - ` : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Priority (Optional)</label>
                <select 
                  className="w-full p-2 border rounded-md bg-white" 
                  value={formData.priority} 
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="CRITICAL">Critical (1 Day SLA)</option>
                  <option value="HIGH">High (3 Days SLA)</option>
                  <option value="MEDIUM">Medium (7 Days SLA)</option>
                  <option value="LOW">Low (15 Days SLA)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Description (Optional)</label>
              <Textarea 
                className="h-32" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Detailed steps to reproduce, or feature requirements..." 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Current Result (Optional)</label>
                <Textarea 
                  value={formData.currentResult} 
                  onChange={e => setFormData({...formData, currentResult: e.target.value})} 
                  placeholder="What is happening right now?" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Expected Result (Optional)</label>
                <Textarea 
                  value={formData.expectedResult} 
                  onChange={e => setFormData({...formData, expectedResult: e.target.value})} 
                  placeholder="What should happen instead?" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Assign Developer Team (Optional)</label>
              <select 
                className="w-full p-2 border rounded-md bg-white" 
                value={formData.assignedTeamId} 
                onChange={e => setFormData({...formData, assignedTeamId: e.target.value})}
              >
                <option value="">Unassigned</option>
                {teams?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/settings/dev-hub')}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  'Create Ticket'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
