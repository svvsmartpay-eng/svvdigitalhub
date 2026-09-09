
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevIssueDetails, useDevIssues, useUpdateDevIssueStatus, useAddDevIssueComment } from '@/api/devHub.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send, Share2 } from 'lucide-react';
import ShareIssueButton from '@/components/dev-hub/ShareIssueButton';

export default function IssueDetailsPage() {
  const { id } = useParams();
  const { data: issue, isLoading } = useDevIssueDetails(id as string);
  const { data: allIssues } = useDevIssues();
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{issue.ticketCode} - {issue.title}</h1>
          <div className="flex gap-2 text-sm text-gray-500 mt-1">
            <span className="bg-blue-100 text-blue-800 px-2 rounded">{issue.status}</span>
            <span>Priority: {issue.priority}</span>
            <span>Created By: {issue.createdBy}</span>
          </div>
        </div>
        {/* Share button in details header */}
        <div className="shrink-0">
          <ShareIssueButton issue={issue} allIssues={allIssues} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap">{issue.description}</CardContent>
          </Card>
          
          {(issue.currentResult || issue.expectedResult) && (
            <Card>
              <CardHeader><CardTitle>Bug Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {issue.currentResult && (
                  <div>
                    <div className="text-sm font-bold text-red-600 mb-1">⚠️ Current Behavior</div>
                    <p className="text-sm bg-red-50 border border-red-100 rounded p-2">{issue.currentResult}</p>
                  </div>
                )}
                {issue.expectedResult && (
                  <div>
                    <div className="text-sm font-bold text-green-600 mb-1">✅ Expected Behavior</div>
                    <p className="text-sm bg-green-50 border border-green-100 rounded p-2">{issue.expectedResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                <Button onClick={handleAddComment} className="h-auto"><Send className="w-4 h-4 mr-2"/>Post</Button>
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
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="NEED_INFO">Need Info</option>
                    <option value="TESTING">Testing</option>
                    <option value="VERIFIED_BY_SVV">Verified by SVV</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <Button onClick={handleStatusUpdate} disabled={!statusVal}>Update</Button>
                </div>
              </div>

              {/* Share section in sidebar */}
              <div className="border-t pt-3">
                <label className="text-sm font-bold mb-2 block">Share Ticket</label>
                <ShareIssueButton issue={issue} allIssues={allIssues} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ticket Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium">{issue.category?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priority</span>
                <span className={`font-bold ${issue.priority === 'CRITICAL' ? 'text-red-600' : issue.priority === 'HIGH' ? 'text-orange-600' : issue.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>{issue.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned Team</span>
                <span className="font-medium">{issue.assignedTeam?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
              {issue.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-red-600">{new Date(issue.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Attachments</span>
                <span className="font-medium">{issue.attachments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comments</span>
                <span className="font-medium">{issue.timeline?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
