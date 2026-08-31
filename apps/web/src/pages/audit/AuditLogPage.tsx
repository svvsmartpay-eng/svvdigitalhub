import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { useAuditLogs } from '@/api/audit.api';
import DataTable from '@/components/shared/DataTable';

export default function AuditLogPage() {
  const { data: response, isLoading } = useAuditLogs();
  const logs = response || [];

  return (
    <div className="space-y-6">
      <PageHeader title="System Audit Logs" subtitle="Security and activity history" />
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <DataTable
          columns={[
            { key: 'createdAt', header: 'Timestamp', render: (row: any) => new Date(row.createdAt).toLocaleString() },
            { key: 'user', header: 'User', render: (row: any) => row.user?.name || 'System' },
            { key: 'action', header: 'Action' },
            { key: 'resource', header: 'Resource' },
            { key: 'details', header: 'Details', render: (row: any) => row.details || '-' },
          ]}
          data={logs}
          loading={isLoading} emptyMessage="No audit logs found."
        />
      </div>
    </div>
  );
}
