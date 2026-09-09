
import React from 'react';
import { useDevIssues } from '@/api/devHub.api';
import { Card, CardContent } from '@/components/ui/card';
import { Code, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import ShareIssueButton from '@/components/dev-hub/ShareIssueButton';

export default function FilteredIssuesPage({ title, filterType }: { title: string, filterType: 'RUNNING' | 'COMPLETED' | 'OVERDUE' }) {
  const { data: issues, isLoading } = useDevIssues();

  const filtered = issues?.filter((i: any) => {
    if (filterType === 'RUNNING') return ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'NEED_INFO', 'TESTING'].includes(i.status);
    if (filterType === 'COMPLETED') return ['COMPLETED_BY_DEV', 'VERIFIED_BY_SVV', 'CLOSED'].includes(i.status);
    if (filterType === 'OVERDUE') return i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={`Showing ${filtered?.length || 0} issues`} />
      
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered?.map((issue: any) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border">
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
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{issue.category?.name || 'Issue'}</span>
                      <span className="font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{issue.priority}</span>
                      {issue.assignedTeam && <span className="font-medium bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">Dev: {issue.assignedTeam.name}</span>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Created {new Date(issue.createdAt).toLocaleDateString()}</span>
                      {issue.dueDate && <span className="text-red-500 font-bold">Due: {new Date(issue.dueDate).toLocaleDateString()}</span>}
                    </div>
                    <ShareIssueButton issue={issue} allIssues={issues} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered?.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500">No issues found in this view.</div>}
        </div>
      )}
    </div>
  );
}
