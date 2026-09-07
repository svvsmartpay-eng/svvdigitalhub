const fs = require('fs');
const path = require('path');

const files = {
  'apps/web/src/pages/dev-hub/DevHubLayout.tsx': `
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, PlayCircle, CheckCircle2, AlertTriangle, Tags, Users, FileBarChart } from 'lucide-react';

export default function DevHubLayout() {
  const location = useLocation();

  const menu = [
    { name: 'Dashboard', path: '/settings/dev-hub', icon: LayoutDashboard },
    { name: 'Create Issue', path: '/settings/dev-hub/create', icon: PlusCircle },
    { name: 'Running Issues', path: '/settings/dev-hub/running', icon: PlayCircle },
    { name: 'Completed Issues', path: '/settings/dev-hub/completed', icon: CheckCircle2 },
    { name: 'Overdue Issues', path: '/settings/dev-hub/overdue', icon: AlertTriangle },
    { name: 'Categories', path: '/settings/dev-hub/categories', icon: Tags },
    { name: 'Developer Teams', path: '/settings/dev-hub/teams', icon: Users },
    { name: 'Reports', path: '/settings/dev-hub/reports', icon: FileBarChart },
  ];

  return (
    <div className="flex h-full min-h-[80vh] gap-6 bg-slate-50 p-4 rounded-lg">
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-1">
          <h3 className="font-bold text-gray-800 mb-4 px-2 uppercase text-xs tracking-wider">Issue Hub Menu</h3>
          {menu.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/settings/dev-hub' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={"flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors " + (isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-slate-100")}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
`,
  'apps/web/src/pages/dev-hub/ManageCategories.tsx': `
import React, { useState } from 'react';
import { useDevCategories } from '@/api/devHub.api';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Loader2 } from 'lucide-react';

export default function ManageCategories() {
  const { data: categories, isLoading } = useDevCategories();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [group, setGroup] = useState('SERVICE ISSUES');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiClient.post('/dev-hub/admin/categories', { name, group });
    await queryClient.invalidateQueries({ queryKey: ['dev-categories'] });
    setName('');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Issue Categories" subtitle="Manage issue classification" />
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-1 h-fit">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4">Add Category</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block">Group</label>
                <select className="w-full border p-2 rounded" value={group} onChange={e => setGroup(e.target.value)}>
                  <option value="SERVICE ISSUES">SERVICE ISSUES</option>
                  <option value="PORTAL ISSUES">PORTAL ISSUES</option>
                  <option value="REPORTS">REPORTS</option>
                  <option value="OTHERS">OTHERS</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Category Name</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AEPS" />
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Add Category'}</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b"><th className="pb-2">Group</th><th className="pb-2">Name</th></tr></thead>
                <tbody>
                  {categories?.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2 text-gray-500 font-medium">{c.group}</td>
                      <td className="py-2 font-bold">{c.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`,
  'apps/web/src/pages/dev-hub/ManageTeams.tsx': `
import React, { useState } from 'react';
import { useDevTeams } from '@/api/devHub.api';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import { Loader2, Copy, ExternalLink } from 'lucide-react';

export default function ManageTeams() {
  const { data: teams, isLoading } = useDevTeams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiClient.post('/dev-hub/admin/teams', form);
    await queryClient.invalidateQueries({ queryKey: ['dev-teams'] });
    setForm({ name: '', contactEmail: '', contactPhone: '' });
    setSaving(false);
  };

  const copyLink = (token: string) => {
    const url = \`\${window.location.origin}/dev-portal/\${token}\`;
    navigator.clipboard.writeText(url);
    alert('Public Developer Link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Developer Teams" subtitle="Manage external dev agencies & generate public links" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 h-fit">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4">Add Developer Team</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block">Team / Company Name</label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. CodeCrafters Inc" />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Contact Email (Optional)</label>
                <Input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Contact Phone (Optional)</label>
                <Input value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
              </div>
              <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Add Team'}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="col-span-2 space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : teams?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{t.name}</h4>
                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>Email: {t.contactEmail || 'N/A'}</span>
                    <span>Phone: {t.contactPhone || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyLink(t.publicToken)}>
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>
                  <Button size="sm" onClick={() => window.open(\`/dev-portal/\${t.publicToken}\`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" /> Open Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
`,
  'apps/web/src/pages/dev-hub/FilteredIssuesPage.tsx': `
import React from 'react';
import { useDevIssues } from '@/api/devHub.api';
import { Card, CardContent } from '@/components/ui/card';
import { Code, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';

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
      <PageHeader title={title} subtitle={\`Showing \${filtered?.length || 0} issues\`} />
      
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
                        <Link to={\`/settings/dev-hub/issues/\${issue.id}\`}>{issue.ticketCode} {issue.title}</Link>
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
                    <span>Created {new Date(issue.createdAt).toLocaleDateString()}</span>
                    {issue.dueDate && <span className="text-red-500 font-bold">Due: {new Date(issue.dueDate).toLocaleDateString()}</span>}
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
`,
  'apps/web/src/pages/dev-hub/DevHubReports.tsx': `
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
    const headers = 'Ticket,Title,Category,Priority,Status,Team,Created,Due Date\\n';
    const csv = filtered.map((i: any) => 
      \`\${i.ticketCode},"\${i.title}",\${i.category?.name},\${i.priority},\${i.status},\${i.assignedTeam?.name || 'Unassigned'},\${new Date(i.createdAt).toISOString().split('T')[0]},\${i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : ''}\`
    ).join('\\n');
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
`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.resolve(filepath), content, 'utf8');
}
