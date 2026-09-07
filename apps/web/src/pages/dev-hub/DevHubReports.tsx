
import React, { useState } from 'react';
import { useDevIssues } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function DevHubReports() {
  const { data: issues, isLoading } = useDevIssues();
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = issues?.filter((i: any) => filterStatus ? i.status === filterStatus : true);

  const exportCsv = () => {
    if (!filtered) return;
    const headers = 'Ticket,Title,Category,Priority,Status,Team,Created,Due Date\n';
    const csv = filtered.map((i: any) => 
      `${i.ticketCode},"${i.title}",${i.category?.name},${i.priority},${i.status},${i.assignedTeam?.name || 'Unassigned'},${new Date(i.createdAt).toISOString().split('T')[0]},${i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : ''}`
    ).join('\n');
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'developer_issues_report.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Issue Reports" subtitle="Generate MIS and tracking reports" />
      <Card>
        <CardContent className="p-4 flex gap-4 items-end">
          <div>
            <label className="text-xs font-bold block mb-1">Filter by Status</label>
            <select className="border p-2 rounded" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED_BY_DEV">Completed By Dev</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <Button onClick={exportCsv} variant="outline"><Download className="w-4 h-4 mr-2"/> Export CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-3 font-bold text-blue-600">{i.ticketCode}</td>
                  <td className="p-3">{i.title}</td>
                  <td className="p-3">{i.category?.name}</td>
                  <td className="p-3">{i.priority}</td>
                  <td className="p-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">{i.status}</span></td>
                  <td className="p-3">{new Date(i.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
