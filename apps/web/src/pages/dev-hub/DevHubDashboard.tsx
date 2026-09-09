import React, { useState } from 'react';
import { useDevIssues } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Code, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ShareIssueButton from '@/components/dev-hub/ShareIssueButton';

export default function DevHubDashboard() {
  const { data: issues, isLoading } = useDevIssues();

  const stats = {
    total: issues?.length || 0,
    inProgress: issues?.filter((i: any) => i.status === 'IN_PROGRESS').length || 0,
    pending: issues?.filter((i: any) => i.status === 'NEED_INFO' || i.status === 'TESTING').length || 0,
    overdue: issues?.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED').length || 0,
    completed: issues?.filter((i: any) => i.status === 'CLOSED').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Developer Issue Hub" subtitle="Track • Collaborate • Resolve • Deliver" />
        <Link to="/settings/dev-hub/create">
          <Button className="bg-[#0D6EFD] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create New Issue
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[#EFF6FF] border-[#B6D4FE]">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-[#0D6EFD]"><Code className="w-5 h-5"/> <span className="font-bold">Total Tickets</span></div>
            <span className="text-3xl font-black text-[#081B3A]">{stats.total}</span>
          </CardContent>
        </Card>
        <Card className="bg-[#F0FDF4] border-[#BBF7D0]">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-[#16A34A]"><CheckCircle2 className="w-5 h-5"/> <span className="font-bold">In Progress</span></div>
            <span className="text-3xl font-black text-[#081B3A]">{stats.inProgress}</span>
          </CardContent>
        </Card>
        <Card className="bg-[#FFFBEB] border-[#FDE68A]">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-[#D97706]"><Clock className="w-5 h-5"/> <span className="font-bold">Pending</span></div>
            <span className="text-3xl font-black text-[#081B3A]">{stats.pending}</span>
          </CardContent>
        </Card>
        <Card className="bg-[#FEF2F2] border-[#FECACA]">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-[#DC2626]"><AlertCircle className="w-5 h-5"/> <span className="font-bold">Overdue</span></div>
            <span className="text-3xl font-black text-[#081B3A]">{stats.overdue}</span>
          </CardContent>
        </Card>
        <Card className="bg-[#F5F3FF] border-[#DDD6FE]">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-[#7C3AED]"><CheckCircle2 className="w-5 h-5"/> <span className="font-bold">Completed</span></div>
            <span className="text-3xl font-black text-[#081B3A]">{stats.completed}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-lg text-[#081B3A]">Recent Tickets</h3>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
          ) : (
            <div className="space-y-4">
              {issues?.slice(0, 5).map((issue: any) => (
                <Card key={issue.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex gap-4">
                    <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border">
                      {issue.attachments?.[0]?.url ? (
                        <img src={issue.attachments[0].url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Code className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-base text-[#081B3A] hover:underline cursor-pointer">
                            <Link to={`/settings/dev-hub/issues/${issue.id}`}>{issue.ticketCode} {issue.title}</Link>
                          </h4>
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">{issue.status}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{issue.category?.name || 'Issue'}</span>
                          <span className="text-xs font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{issue.priority}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-1">{issue.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 font-medium">
                        <div className="flex gap-3">
                          <span>{issue.attachments?.length || 0} attachments</span>
                          <span>Created by {issue.createdBy}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                          <ShareIssueButton issue={issue} allIssues={issues} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-[#081B3A] mb-4">SLA / Overdue Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-2 text-red-600"><AlertCircle className="w-4 h-4"/> Overdue &gt; 7 Days</span>
                  <span className="font-bold text-lg">{issues?.filter((i: any) => i.dueDate && (new Date().getTime() - new Date(i.dueDate).getTime()) > 7 * 86400000).length || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-2 text-orange-600"><AlertCircle className="w-4 h-4"/> Overdue 4-7 Days</span>
                  <span className="font-bold text-lg">0</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-2 text-blue-600"><Clock className="w-4 h-4"/> Due Today</span>
                  <span className="font-bold text-lg">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
