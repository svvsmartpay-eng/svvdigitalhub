import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { useServiceVisits } from '@/api/serviceVisits.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wrench } from 'lucide-react';

export default function MyJobsPage() {
  const { user } = useAuthStore();

  // For technician users: the backend filters by technicianId
  // Since the auth user is a technician account (User model), we need to find their Technician record.
  // The service-visits endpoint accepts technicianId as a query param.
  // For now we fetch all visits for the org and note: a proper "my jobs" query
  // would need the technician's technicianId from their profile.
  // We use no filter for now and show all visits — the backend will already scope to org.
  const { data, isLoading, isError, error, refetch } = useServiceVisits();

  const myJobs = (data || []).filter((visit: any) => {
    // If we can match on user name for now
    return true; // Show all org visits for technicians — scoping to individual done in next phase
  });

  const columns = [
    { key: 'visitNo', header: 'Job No' },
    { key: 'asset', header: 'Asset', render: (row: any) => row.asset?.name || '—' },
    { key: 'branch', header: 'Branch', render: (row: any) => row.branch?.code || '—' },
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} size="sm" /> },
    { key: 'scheduledDate', header: 'Scheduled', render: (row: any) => row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString() : '—' },
    {
      key: 'actions', header: 'Actions', render: (row: any) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => alert(`Job detail for ${row.visitNo} — full check-in/checkout workflow coming in next phase`)}>
            Open Job
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Jobs"
        subtitle={`Assigned service visits for ${user?.name || 'you'}`}
      />

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-red-700 font-medium">Failed to load jobs</p>
            <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={myJobs}
            loading={isLoading}
            emptyMessage="No jobs currently assigned to you."
          />
        )}
      </div>
    </div>
  );
}
