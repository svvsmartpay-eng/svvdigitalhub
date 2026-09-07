const fs = require('fs');
const path = require('path');

const files = {
  'apps/web/src/pages/dev-hub/CreateIssuePage.tsx': `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevCategories, useDevTeams, useCreateDevIssue } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function CreateIssuePage() {
  const navigate = useNavigate();
  const { data: categories } = useDevCategories();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(formData);
    navigate('/settings/dev-hub');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Create Developer Issue" subtitle="Log a new task, bug, or feature request." />
      
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Issue Title</label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Short summary of the issue" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Category</label>
                <select required className="w-full p-2 border rounded-md" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  <option value="">Select Category...</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.group} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Priority</label>
                <select required className="w-full p-2 border rounded-md" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="CRITICAL">Critical (1 Day SLA)</option>
                  <option value="HIGH">High (3 Days SLA)</option>
                  <option value="MEDIUM">Medium (7 Days SLA)</option>
                  <option value="LOW">Low (15 Days SLA)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Description</label>
              <Textarea required className="h-32" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed steps to reproduce, or feature requirements..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Current Result (Optional)</label>
                <Textarea value={formData.currentResult} onChange={e => setFormData({...formData, currentResult: e.target.value})} placeholder="What is happening right now?" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Expected Result (Optional)</label>
                <Textarea value={formData.expectedResult} onChange={e => setFormData({...formData, expectedResult: e.target.value})} placeholder="What should happen instead?" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Assign Developer Team (Optional)</label>
              <select className="w-full p-2 border rounded-md" value={formData.assignedTeamId} onChange={e => setFormData({...formData, assignedTeamId: e.target.value})}>
                <option value="">Unassigned</option>
                {teams?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/settings/dev-hub')}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
`,
  'apps/web/src/pages/dev-hub/IssueDetailsPage.tsx': `
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevIssueDetails, useUpdateDevIssueStatus, useAddDevIssueComment } from '@/api/devHub.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send } from 'lucide-react';

export default function IssueDetailsPage() {
  const { id } = useParams();
  const { data: issue, isLoading } = useDevIssueDetails(id as string);
  const updateStatus = useUpdateDevIssueStatus();
  const addComment = useAddDevIssueComment();

  const [commentText, setCommentText] = useState('');
  const [statusVal, setStatusVal] = useState('');

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!issue) return <div>Issue not found</div>;

  const handleStatusUpdate = async () => {
    if (!statusVal) return;
    await updateStatus.mutateAsync({ id: issue.id, status: statusVal, comment: 'Admin updated status' });
    setStatusVal('');
  };

  const handleAddComment = async () => {
    if (!commentText) return;
    await addComment.mutateAsync({ id: issue.id, comment: commentText });
    setCommentText('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/settings/dev-hub"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{issue.ticketCode} - {issue.title}</h1>
          <div className="flex gap-2 text-sm text-gray-500 mt-1">
            <span className="bg-blue-100 text-blue-800 px-2 rounded">{issue.status}</span>
            <span>Priority: {issue.priority}</span>
            <span>Created By: {issue.createdBy}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap">{issue.description}</CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {issue.timeline?.map((t: any) => (
                <div key={t.id} className="border-l-2 border-blue-200 pl-4 py-2">
                  <div className="flex justify-between">
                    <span className="font-bold">{t.authorName} <span className="text-gray-500 font-normal text-sm">({t.authorType})</span></span>
                    <span className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-blue-600 my-1">{t.action}</p>
                  {t.comment && <p className="text-sm mt-1">{t.comment}</p>}
                  {t.rootCause && (
                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs border">
                      <p><strong>Root Cause:</strong> {t.rootCause}</p>
                      <p><strong>Fix Details:</strong> {t.fixDetails}</p>
                      <p><strong>Deployment:</strong> {t.deploymentDetails}</p>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-4 flex gap-2">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Type a comment..." className="flex-1" />
                <Button onClick={handleAddComment} className="h-auto"><Send className="w-4 h-4 mr-2"/> Post</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-1 block">Change Status</label>
                <div className="flex gap-2">
                  <select className="flex-1 p-2 border rounded-md" value={statusVal} onChange={e => setStatusVal(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="NEED_INFO">Need Info</option>
                    <option value="TESTING">Testing</option>
                    <option value="VERIFIED_BY_SVV">Verified by SVV</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <Button onClick={handleStatusUpdate} disabled={!statusVal}>Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.resolve(filepath), content, 'utf8');
}
