const fs = require('fs');
const path = require('path');

const files = {
  'apps/web/src/pages/dev-portal/DevPortalLayout.tsx': `
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { usePortalDashboard } from '@/api/devHub.api';
import { Loader2, Code2 } from 'lucide-react';

export default function DevPortalLayout() {
  const { token } = useParams();
  const { data, isLoading, error } = usePortalDashboard(token as string);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Invalid or Expired Developer Token</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <Code2 className="w-6 h-6" /> SVV Developer Portal
          </div>
          <div className="text-sm font-medium text-slate-600">
            Welcome, {data.teamName}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet context={{ token, teamName: data.teamName, stats: data.stats, issues: data.issues }} />
      </main>
    </div>
  );
}
`,
  'apps/web/src/pages/dev-portal/DevPortalDashboard.tsx': `
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePortalUpdateStatus, usePortalAddComment } from '@/api/devHub.api';

export default function DevPortalDashboard() {
  const { token, teamName, stats, issues } = useOutletContext<any>();
  
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const [completionForm, setCompletionForm] = useState({ rootCause: '', fixDetails: '', deploymentDetails: '', comment: '' });
  
  const updateStatusMut = usePortalUpdateStatus();
  const addCommentMut = usePortalAddComment();

  const handleUpdateClick = (issue: any, status: string) => {
    setSelectedIssue(issue);
    setNewStatus(status);
    setIsStatusModalOpen(true);
  };

  const submitStatus = async () => {
    if (newStatus === 'COMPLETED_BY_DEV') {
      await updateStatusMut.mutateAsync({ id: selectedIssue.id, token, data: { status: newStatus, ...completionForm } });
    } else {
      await updateStatusMut.mutateAsync({ id: selectedIssue.id, token, data: { status: newStatus, comment: completionForm.comment } });
    }
    setIsStatusModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-6">
          <div className="text-sm text-gray-500 font-bold mb-1">Total Assigned</div>
          <div className="text-3xl font-black">{stats.total}</div>
        </CardContent></Card>
        <Card className="bg-orange-50 border-orange-200"><CardContent className="p-6">
          <div className="text-sm text-orange-600 font-bold mb-1">Pending</div>
          <div className="text-3xl font-black text-orange-700">{stats.pending}</div>
        </CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-6">
          <div className="text-sm text-green-600 font-bold mb-1">Completed</div>
          <div className="text-3xl font-black text-green-700">{stats.completed}</div>
        </CardContent></Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold mb-4">Your Tasks</h2>
        <div className="space-y-4">
          {issues.map((issue: any) => (
            <div key={issue.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <span className="font-bold text-lg">{issue.ticketCode} {issue.title}</span>
                  <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded font-bold">{issue.status}</span>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">{issue.priority}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{issue.description}</p>
              </div>
              <div className="flex gap-2">
                {issue.status !== 'CLOSED' && issue.status !== 'VERIFIED_BY_SVV' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateClick(issue, 'IN_PROGRESS')}>Start Work</Button>
                    <Button size="sm" className="bg-green-600 text-white" onClick={() => handleUpdateClick(issue, 'COMPLETED_BY_DEV')}>Mark Fixed</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Update Status: {newStatus}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {newStatus === 'COMPLETED_BY_DEV' ? (
              <>
                <div>
                  <label className="text-xs font-bold block mb-1">Root Cause (Mandatory)</label>
                  <Textarea required value={completionForm.rootCause} onChange={e => setCompletionForm({...completionForm, rootCause: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">What Was Fixed? (Mandatory)</label>
                  <Textarea required value={completionForm.fixDetails} onChange={e => setCompletionForm({...completionForm, fixDetails: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Deployment Details (Mandatory)</label>
                  <Textarea required value={completionForm.deploymentDetails} onChange={e => setCompletionForm({...completionForm, deploymentDetails: e.target.value})} placeholder="e.g., Deployed to prod branch, requires DB migration..." />
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-bold block mb-1">Comment (Optional)</label>
                <Textarea value={completionForm.comment} onChange={e => setCompletionForm({...completionForm, comment: e.target.value})} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={submitStatus} disabled={updateStatusMut.isPending}>Save Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.resolve(filepath), content, 'utf8');
}
