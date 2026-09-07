
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
