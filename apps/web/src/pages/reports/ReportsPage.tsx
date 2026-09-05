import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart3, Clock, AlertTriangle, FileText, CheckCircle,
  IndianRupee, Loader2, X, Download, Building2, Users, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAssetRegister, useIssueAging, useSLACompliance,
  useVendorPerformanceReport, usePMCompliance, useCostReport,
  useExpiringContracts
} from '@/api/reports.api';
import { usePrintOrders } from '@/api/printHub.api';
import DataTable from '@/components/shared/DataTable';
import { formatISTDateTime, formatDurationMins } from '@/lib/istUtils';

type ReportKey =
  | 'ticket-branch'
  | 'ticket-staff'
  | 'service-revenue'
  | 'time-analysis'
  | 'asset-register'
  | 'issue-aging'
  | 'sla-compliance'
  | 'cost-report'
  | 'vendor-performance'
  | 'expiring-contracts'
  | 'pm-compliance';

interface ReportConfig {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'TICKETS' | 'ASSETS';
}

const REPORTS: ReportConfig[] = [
  // CSC / WhatsApp Ticket Workflow Reports
  {
    key: 'ticket-branch',
    title: 'Tickets by Branch',
    description: 'Breakdown of tickets received, completed, and revenue by branch',
    icon: <Building2 className="text-[#0D6EFD]" />,
    category: 'TICKETS',
  },
  {
    key: 'ticket-staff',
    title: 'Tickets by Staff',
    description: 'Work efficiency, active jobs, and completion rate per staff member',
    icon: <Users className="text-[#6F42C1]" />,
    category: 'TICKETS',
  },
  {
    key: 'service-revenue',
    title: 'Revenue by Service Type',
    description: 'Income distribution across PAN Cards, Photo Prints, PVC, Xerox, etc.',
    icon: <IndianRupee className="text-[#198754]" />,
    category: 'TICKETS',
  },
  {
    key: 'time-analysis',
    title: 'Waiting & Processing Times (IST)',
    description: 'Average customer queue waiting time and operator service turnaround time',
    icon: <Clock className="text-[#FD7E14]" />,
    category: 'TICKETS',
  },

  // AMS & Maintenance Reports
  {
    key: 'asset-register',
    title: 'Asset Register',
    description: 'Complete list of all hardware assets across branches',
    icon: <FileText className="text-blue-500" />,
    category: 'ASSETS',
  },
  {
    key: 'cost-report',
    title: 'Cost Analysis',
    description: 'Maintenance and equipment spending breakdown',
    icon: <IndianRupee className="text-emerald-500" />,
    category: 'ASSETS',
  },
  {
    key: 'issue-aging',
    title: 'Issue Aging',
    description: 'Open issues with age in days and SLA breach status',
    icon: <Clock className="text-amber-500" />,
    category: 'ASSETS',
  },
  {
    key: 'sla-compliance',
    title: 'SLA Compliance',
    description: 'Vendor and team SLA performance metrics',
    icon: <CheckCircle className="text-green-500" />,
    category: 'ASSETS',
  },
  {
    key: 'vendor-performance',
    title: 'Vendor Performance',
    description: 'Metrics and ratings for external repair vendors',
    icon: <BarChart3 className="text-purple-500" />,
    category: 'ASSETS',
  },
  {
    key: 'expiring-contracts',
    title: 'Expiring Contracts',
    description: 'Warranties and AMCs expiring within 90 days',
    icon: <AlertTriangle className="text-red-500" />,
    category: 'ASSETS',
  },
  {
    key: 'pm-compliance',
    title: 'PM Compliance',
    description: 'Preventive maintenance completion rate',
    icon: <CheckCircle className="text-teal-500" />,
    category: 'ASSETS',
  },
];

// Helper to export any data array to CSV
function exportToCsv(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    alert('No data to export.');
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function ReportModal({ reportKey, onClose }: { reportKey: ReportKey; onClose: () => void }) {
  const assetReg = useAssetRegister();
  const issueAging = useIssueAging();
  const sla = useSLACompliance();
  const vendor = useVendorPerformanceReport();
  const pm = usePMCompliance();
  const cost = useCostReport();
  const contracts = useExpiringContracts();
  const ordersQuery = usePrintOrders({});

  const config = REPORTS.find((r) => r.key === reportKey)!;

  // Render content based on key
  const renderContent = () => {
    // 1. CSC Ticket Reports (Derived from ordersQuery)
    if (
      reportKey === 'ticket-branch' ||
      reportKey === 'ticket-staff' ||
      reportKey === 'service-revenue' ||
      reportKey === 'time-analysis'
    ) {
      if (ordersQuery.isLoading || ordersQuery.isFetching) {
        return (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin text-[#0D6EFD]" />
            <p className="text-sm">Calculating ticket metrics in IST...</p>
          </div>
        );
      }

      const orders: any[] = ordersQuery.data?.data || [];

      if (reportKey === 'ticket-branch') {
        const branchMap: Record<string, { branch: string; totalTickets: number; completed: number; revenue: number }> = {};

        orders.forEach((o) => {
          const bName = o.branch?.name || (o.branchId?.includes('f5abaacc') ? 'SVV Main Hub (Isnapur)' : 'Branch 2');
          if (!branchMap[bName]) {
            branchMap[bName] = { branch: bName, totalTickets: 0, completed: 0, revenue: 0 };
          }
          branchMap[bName].totalTickets += 1;
          if (o.ticket_status === 'CLOSED' || o.status === 'DELIVERED') {
            branchMap[bName].completed += 1;
          }
          branchMap[bName].revenue += Number(o.totalAmount || 0);
        });

        const rows = Object.values(branchMap);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border">
              <span className="text-xs font-bold text-[#081B3A]">Total Branches: {rows.length}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToCsv('Tickets_By_Branch_Report', rows)}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <DataTable
              columns={[
                { key: 'branch', header: 'Branch Name' },
                { key: 'totalTickets', header: 'Total Tickets Received' },
                { key: 'completed', header: 'Closed / Completed' },
                {
                  key: 'revenue',
                  header: 'Total Revenue (₹)',
                  render: (r: any) => `₹${r.revenue.toLocaleString()}`,
                },
              ]}
              data={rows}
              emptyMessage="No branch ticket data found."
            />
          </div>
        );
      }

      if (reportKey === 'ticket-staff') {
        const staffMap: Record<string, { staff: string; role: string; totalServed: number; completed: number; revenue: number }> = {};

        orders.forEach((o) => {
          const sName = o.assignedStaff?.name || o.assignedStaffName || 'Unassigned';
          const sRole = o.assignedStaff?.role || 'Staff Desk';
          if (!staffMap[sName]) {
            staffMap[sName] = { staff: sName, role: sRole, totalServed: 0, completed: 0, revenue: 0 };
          }
          staffMap[sName].totalServed += 1;
          if (o.ticket_status === 'CLOSED' || o.status === 'DELIVERED') {
            staffMap[sName].completed += 1;
          }
          staffMap[sName].revenue += Number(o.totalAmount || 0);
        });

        const rows = Object.values(staffMap);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border">
              <span className="text-xs font-bold text-[#081B3A]">Active Operators: {rows.length}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToCsv('Tickets_By_Staff_Report', rows)}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <DataTable
              columns={[
                { key: 'staff', header: 'Staff Name' },
                { key: 'role', header: 'Role' },
                { key: 'totalServed', header: 'Tickets Handled' },
                { key: 'completed', header: 'Completed' },
                {
                  key: 'revenue',
                  header: 'Revenue Generated (₹)',
                  render: (r: any) => `₹${r.revenue.toLocaleString()}`,
                },
              ]}
              data={rows}
              emptyMessage="No staff ticket data found."
            />
          </div>
        );
      }

      if (reportKey === 'service-revenue') {
        const serviceMap: Record<string, { service: string; ordersCount: number; totalRevenue: number }> = {
          'PAN Card Application': { service: 'PAN Card Application', ordersCount: 0, totalRevenue: 0 },
          'Photo Print (4 Copies)': { service: 'Photo Print (4 Copies)', ordersCount: 0, totalRevenue: 0 },
          'Lamination': { service: 'Lamination', ordersCount: 0, totalRevenue: 0 },
          'PVC Plastic Card Print': { service: 'PVC Plastic Card Print', ordersCount: 0, totalRevenue: 0 },
          'Color Document Print': { service: 'Color Document Print', ordersCount: 0, totalRevenue: 0 },
          'B&W Xerox / Copy': { service: 'B&W Xerox / Copy', ordersCount: 0, totalRevenue: 0 },
          'Other Online Services': { service: 'Other Online Services', ordersCount: 0, totalRevenue: 0 },
        };

        orders.forEach((o) => {
          const docName = (o.documentName || '').toLowerCase();
          let matched = 'Other Online Services';
          if (docName.includes('pan')) matched = 'PAN Card Application';
          else if (docName.includes('photo') || docName.includes('passport')) matched = 'Photo Print (4 Copies)';
          else if (docName.includes('lamination')) matched = 'Lamination';
          else if (docName.includes('pvc') || docName.includes('card') || docName.includes('aadhaar')) matched = 'PVC Plastic Card Print';
          else if (docName.includes('color')) matched = 'Color Document Print';
          else if (docName.includes('xerox') || docName.includes('copy')) matched = 'B&W Xerox / Copy';

          serviceMap[matched].ordersCount += 1;
          serviceMap[matched].totalRevenue += Number(o.totalAmount || 0);
        });

        const rows = Object.values(serviceMap);
        const grandTotal = rows.reduce((s, r) => s + r.totalRevenue, 0);

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#F0FDF4] p-3 rounded-xl border border-[#BBF7D0]">
              <span className="text-sm font-bold text-[#198754]">Grand Revenue: ₹{grandTotal.toLocaleString()}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToCsv('Service_Revenue_Report', rows)}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <DataTable
              columns={[
                { key: 'service', header: 'Service Category' },
                { key: 'ordersCount', header: 'Jobs Count' },
                {
                  key: 'totalRevenue',
                  header: 'Total Revenue (₹)',
                  render: (r: any) => `₹${r.totalRevenue.toLocaleString()}`,
                },
              ]}
              data={rows}
              emptyMessage="No service revenue data."
            />
          </div>
        );
      }

      if (reportKey === 'time-analysis') {
        const rows = orders.map((o) => ({
          ticket: o.tokenNumber || o.ticket_code || 'T-New',
          customer: o.customerName || 'Customer',
          branch: o.branch?.name || 'Main Branch',
          receivedAt: formatISTDateTime(o.received_at || o.createdAt),
          startedAt: o.started_at ? formatISTDateTime(o.started_at) : '--',
          waitingMins: formatDurationMins(o.waiting_time_seconds || 0),
          processingMins: formatDurationMins(o.processing_time_seconds || 0),
          status: o.ticket_status || o.status,
        }));

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-xl border">
              <span className="text-xs font-bold text-[#081B3A]">Total Audited Tickets: {rows.length}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToCsv('Ticket_Time_Analysis_IST', rows)}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <DataTable
              columns={[
                { key: 'ticket', header: 'Ticket Code' },
                { key: 'customer', header: 'Customer' },
                { key: 'branch', header: 'Branch' },
                { key: 'receivedAt', header: 'Received (IST)' },
                { key: 'startedAt', header: 'Started (IST)' },
                { key: 'waitingMins', header: 'Waiting Time' },
                { key: 'processingMins', header: 'Processing Time' },
                { key: 'status', header: 'Status' },
              ]}
              data={rows}
              emptyMessage="No ticket timeline data."
            />
          </div>
        );
      }
    }

    // 2. Hardware AMS Queries
    const queryMap: Record<string, any> = {
      'asset-register': assetReg,
      'issue-aging': issueAging,
      'sla-compliance': sla,
      'vendor-performance': vendor,
      'pm-compliance': pm,
      'cost-report': cost,
      'expiring-contracts': contracts,
    };

    const query = queryMap[reportKey];
    if (!query) return null;

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
          <p className="text-red-500 text-sm">
            {(query.error as any)?.response?.data?.error || (query.error as any)?.message || 'Unknown error'}
          </p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    const data = query.data;
    if (!data) return <p className="text-center text-gray-500 py-8">No data returned.</p>;

    if (reportKey === 'sla-compliance') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Issues', value: data.total },
            { label: 'SLA Breached', value: data.breached },
            { label: 'Compliance Rate', value: data.compliance },
          ].map((item) => (
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
          ].map((item) => (
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
            {
              key: 'ageDays',
              header: 'Age (days)',
              render: (r: any) => (
                <span className={r.ageDays > 7 ? 'text-red-600 font-medium' : ''}>{r.ageDays}d</span>
              ),
            },
            {
              key: 'slaBreached',
              header: 'SLA',
              render: (r: any) =>
                r.slaBreached ? (
                  <span className="text-red-600 font-medium">BREACHED</span>
                ) : (
                  <span className="text-green-600">OK</span>
                ),
            },
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
            {
              key: 'performanceStats',
              header: 'Total Visits',
              render: (r: any) => r.performanceStats?.totalVisits ?? r._count?.serviceVisits ?? 0,
            },
            {
              key: 'performanceStats',
              header: 'Completed',
              render: (r: any) => r.performanceStats?.completedVisits ?? '-',
            },
            {
              key: 'performanceStats',
              header: 'SLA Breaches',
              render: (r: any) => r.performanceStats?.slaBreachCount ?? '-',
            },
            {
              key: 'performanceStats',
              header: 'Score',
              render: (r: any) =>
                r.performanceStats?.performanceScore ? `${r.performanceStats.performanceScore}/100` : 'N/A',
            },
          ]}
          data={arr}
          emptyMessage="No vendor data."
        />
      );
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
        <div className="flex items-center justify-between p-5 border-b bg-[#081B3A] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">{config.icon}</div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{config.title}</h2>
              <p className="text-xs text-[#CBD5E1]">{config.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
        <div className="border-t p-4 bg-[#F8FAFC] flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} className="text-xs font-medium">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'ASSETS'>('TICKETS');

  const filteredReports = REPORTS.filter((r) => r.category === activeTab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Live CSC operational analytics: Branch, Staff, Service Revenue, and Audit Timelines in IST"
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-[#F1F5F9] p-1 rounded-xl w-fit border border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'TICKETS'
              ? 'bg-[#0D6EFD] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#081B3A]'
          }`}
        >
          WhatsApp & Ticket Reports (CSC)
        </button>
        <button
          onClick={() => setActiveTab('ASSETS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ASSETS'
              ? 'bg-[#081B3A] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#081B3A]'
          }`}
        >
          Hardware AMS & Maintenance Reports
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filteredReports.map((report) => (
          <Card key={report.key} className="hover:shadow-md transition-shadow border-[#E2E8F0] rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base font-bold text-[#081B3A]">
                <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">{report.icon}</div>
                {report.title}
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B]">{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold text-[#0D6EFD] border-[#B6D4FE] hover:bg-[#EFF6FF]"
                onClick={() => setActiveReport(report.key)}
              >
                View Live Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeReport && <ReportModal reportKey={activeReport} onClose={() => setActiveReport(null)} />}
    </div>
  );
}
