import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { usePMSchedules, useCompletePM } from '@/api/pm.api';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function PMPage() {
  const { data: schedules, isLoading, isError, error, refetch } = usePMSchedules();
  const completePM = useCompletePM();

  // Root cause of previous infinite loading:
  // 1. The API endpoint was incorrect (/pm/schedules vs /pm) causing a 404. React Query retries 404s multiple times by default, hanging the UI in 'isLoading' for ~10 seconds.
  // 2. We lacked an explicit error state to show the user what failed.
  // 3. The data parser was trying to read schedulesResponse?.data, but the hook was returning an array.
  
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Preventive Maintenance" />
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
            <p className="text-red-600 mt-1">{(error as any)?.message || 'Failed to load PM schedules.'}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Preventive Maintenance" 
        subtitle="Manage PM schedules and plans"
        actions={<Button><Calendar className="w-4 h-4 mr-2" /> Add PM Plan</Button>}
      />

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Upcoming Schedules</h3>
        
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-gray-500">
            <LoadingSpinner size="lg" />
            <p>Loading schedules...</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'dueDate', header: 'Due Date', render: (row: any) => new Date(row.dueDate).toLocaleDateString() },
              { key: 'plan', header: 'Plan Name', render: (row: any) => row.plan?.name || 'N/A' },
              { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
              { 
                key: 'actions', 
                header: 'Actions', 
                render: (row: any) => (
                  row.status === 'COMPLETED' ? (
                    <span className="text-gray-400 text-sm">Completed</span>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm(`Mark PM Schedule for ${row.plan?.name || 'this asset'} as completed?`)) {
                          completePM.mutate({ id: row.id, data: { result: 'PASS', notes: 'Marked completed via web UI' } });
                        }
                      }}
                      loading={completePM.isPending}
                    >
                      Complete
                    </Button>
                  )
                )
              }
            ]}
            data={schedules || []}
            emptyMessage="No preventive maintenance schedules found."
          />
        )}
      </div>
    </div>
  );
}
