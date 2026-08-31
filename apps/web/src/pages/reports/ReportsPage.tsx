import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Clock, AlertTriangle, FileText, CheckCircle, IndianRupee, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssetRegister, useIssueAging, useSLACompliance, useVendorPerformanceReport, usePMCompliance, useCostReport, useExpiringContracts } from '@/api/reports.api';
import DataTable from '@/components/shared/DataTable';

type ReportKey = 'asset-register' | 'issue-aging' | 'sla-compliance' | 'vendor-performance' | 'pm-compliance' | 'cost-report' | 'expiring-contracts';

interface ReportConfig {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const REPORTS: ReportConfig[] = [
  { key: 'asset-register', title: 'Asset Register', description: 'Complete list of all assets across branches', icon: <FileText className="text-blue-500" /> },
  { key: 'issue-aging', title: 'Issue Aging', description: 'Open issues with age in days and SLA breach status', icon: <Clock className="text-amber-500" /> },
  { key: 'sla-compliance', title: 'SLA Compliance', description: 'Vendor and team SLA performance metrics', icon: <CheckCircle className="text-green-500" /> },
  { key: 'cost-report', title: 'Cost Analysis', description: 'Maintenance spending breakdown by category and branch', icon: <IndianRupee className="text-emerald-500" /> },
  { key: 'vendor-performance', title: 'Vendor Performance', description: 'Metrics and ratings for external vendors', icon: <BarChart3 className="text-purple-500" /> },
  { key: 'expiring-contracts', title: 'Expiring Contracts', description: 'Warranties and AMCs expiring within 90 days', icon: <AlertTriangle className="text-red-500" /> },
  { key: 'pm-compliance', title: 'PM Compliance', description: 'Preventive maintenance completion rate', icon: <CheckCircle className="text-teal-500" /> },
];

function ReportModal({ reportKey, onClose }: { reportKey: ReportKey; onClose: () => void }) {
  const assetReg = useAssetRegister();
  const issueAging = useIssueAging();
  const sla = useSLACompliance();
  const vendor = useVendorPerformanceReport();
  const pm = usePMCompliance();
  const cost = useCostReport();
  const contracts = useExpiringContracts();

  const queryMap: Record<ReportKey, any> = {
    'asset-register': assetReg,
    'issue-aging': issueAging,
    'sla-compliance': sla,
    'vendor-performance': vendor,
    'pm-compliance': pm,
    'cost-report': cost,
    'expiring-contracts': contracts,
  };

  const query = queryMap[reportKey];
  const config = REPORTS.find(r => r.key === reportKey)!;

  // Trigger on mount
  React.useEffect(() => {
    query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey]);

  const renderContent = () => {
    if (query.isLoading || query.isFetching) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f]" />
          <p>Loading report data from database...</p>
        </div>
      );
    }

    if (query.isError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Failed to load report</p>
          <p className="text-red-500 text-sm">{(query.error as any)?.response?.data?.error || (query.error as any)?.message || 'Unknown error'}</p>
          <Button variant="outline" onClick={() => query.refetch()}>Retry</Button>
        </div>
      );
    }

    const data = query.data;
    if (!data) return <p className="text-center text-gray-500 py-8">No data returned.</p>;

    // SLA and PM compliance return summary objects, not arrays
    if (reportKey === 'sla-compliance') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Issues', value: data.total },
            { label: 'SLA Breached', value: data.breached },
            { label: 'Compliance Rate', value: data.compliance },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center border">
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      );
    }

    if (reportKey === 'pm-compliance') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Schedules', value: data.total },
            { label: 'Completed', value: data.completed },
            { label: 'Overdue', value: data.overdue },
            { label: 'Compliance', value: data.compliance },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center border">
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      );
    }

    if (reportKey === 'cost-report') {
      const entries: any[] = data.entries || [];
      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 flex justify-between items-center">
            <span className="font-medium text-green-800">Total Spend</span>
            <span className="text-xl font-bold text-green-900">₹{Number(data.total || 0).toLocaleString()}</span>
          </div>
          <DataTable
            columns={[
              { key: 'recordedAt', header: 'Date', render: (r: any) => new Date(r.recordedAt).toLocaleDateString() },
              { key: 'categoryType', header: 'Category' },
              { key: 'description', header: 'Description' },
              { key: 'amount', header: 'Amount (₹)', render: (r: any) => `₹${Number(r.amount).toLocaleString()}` },
            ]}
            data={entries}
            emptyMessage="No cost entries found."
          />
        </div>
      );
    }

    if (reportKey === 'expiring-contracts') {
      const warranties: any[] = data.warranties || [];
      const amcs: any[] = data.amcs || [];
      return (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Expiring Warranties ({warranties.length})</h4>
            <DataTable
              columns={[
                { key: 'asset', header: 'Asset', render: (r: any) => r.asset?.name || '-' },
                { key: 'endDate', header: 'Expires', render: (r: any) => r.endDate ? new Date(r.endDate).toLocaleDateString() : '-' },
                { key: 'terms', header: 'Terms' },
              ]}
              data={warranties}
              emptyMessage="No expiring warranties."
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Expiring AMC Contracts ({amcs.length})</h4>
            <DataTable
              columns={[
                { key: 'asset', header: 'Asset', render: (r: any) => r.asset?.name || '-' },
                { key: 'contractNo', header: 'Contract No' },
                { key: 'endDate', header: 'Expires', render: (r: any) => r.endDate ? new Date(r.endDate).toLocaleDateString() : '-' },
              ]}
              data={amcs}
              emptyMessage="No expiring AMC contracts."
            />
          </div>
        </div>
      );
    }

    // Generic array reports: asset-register, issue-aging, vendor-performance
    const arr: any[] = Array.isArray(data) ? data : [];

    if (reportKey === 'asset-register') {
      return (
        <DataTable
          columns={[
            { key: 'assetId', header: 'Asset ID' },
            { key: 'name', header: 'Name' },
            { key: 'category', header: 'Category', render: (r: any) => r.category?.name || '-' },
            { key: 'branch', header: 'Branch', render: (r: any) => r.branch?.name || '-' },
            { key: 'status', header: 'Status' },
            { key: 'condition', header: 'Condition' },
          ]}
          data={arr}
          emptyMessage="No assets found."
        />
      );
    }

    if (reportKey === 'issue-aging') {
      return (
        <DataTable
          columns={[
            { key: 'issueNo', header: 'Issue No' },
            { key: 'title', header: 'Title' },
            { key: 'priority', header: 'Priority' },
            { key: 'ageDays', header: 'Age (days)', render: (r: any) => <span className={r.ageDays > 7 ? 'text-red-600 font-medium' : ''}>{r.ageDays}d</span> },
            { key: 'slaBreached', header: 'SLA', render: (r: any) => r.slaBreached ? <span className="text-red-600 font-medium">BREACHED</span> : <span className="text-green-600">OK</span> },
          ]}
          data={arr}
          emptyMessage="No open issues."
        />
      );
    }

    if (reportKey === 'vendor-performance') {
      return (
        <DataTable
          columns={[
            { key: 'name', header: 'Vendor' },
            { key: 'performanceStats', header: 'Total Visits', render: (r: any) => r.performanceStats?.totalVisits ?? r._count?.serviceVisits ?? 0 },
            { key: 'performanceStats', header: 'Completed', render: (r: any) => r.performanceStats?.completedVisits ?? '-' },
            { key: 'performanceStats', header: 'SLA Breaches', render: (r: any) => r.performanceStats?.slaBreachCount ?? '-' },
            { key: 'performanceStats', header: 'Score', render: (r: any) => r.performanceStats?.performanceScore ? `${r.performanceStats.performanceScore}/100` : 'N/A' },
          ]}
          data={arr}
          emptyMessage="No vendor data."
        />
      );
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{config.title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
        <div className="border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Refreshing...</> : 'Refresh'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Click View to generate a report from the live database" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORTS.map((report) => (
          <Card key={report.key} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {report.icon}
                {report.title}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setActiveReport(report.key)}
              >
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeReport && (
        <ReportModal reportKey={activeReport} onClose={() => setActiveReport(null)} />
      )}
    </div>
  );
}
