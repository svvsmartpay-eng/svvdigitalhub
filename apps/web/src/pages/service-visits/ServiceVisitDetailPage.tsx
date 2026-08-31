import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useServiceVisit } from '@/api/serviceVisits.api';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ServiceVisitDetailPage() {
  const { id } = useParams();
  const { data: sv, isLoading, isError, error, refetch } = useServiceVisit(id!);

  if (isLoading) return <LoadingSpinner fullScreen />;
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-700 font-medium">Failed to load service visit</p>
        <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!sv) return <div className="p-8 text-center text-gray-500">Service visit not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={sv.visitNo} 
        subtitle="Service Visit Details"
        breadcrumbs={[{ label: 'Service Visits', href: '/service-visits' }, { label: sv.visitNo }]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={sv.status} />
          </div>
        } 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Summary</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-700">Scheduled Date: {sv.scheduledDate ? new Date(sv.scheduledDate).toLocaleDateString() : '—'}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Workflow Actions</h3>
            <p className="text-sm text-gray-500 italic">Advanced workflow actions (Check-in, Diagnosis, Parts Used) can be managed via the Technician App.</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Information</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Branch</span>
                <span className="font-medium">{sv.branch?.name || '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Asset</span>
                <span className="font-medium">{sv.asset ? <Link to={`/assets/${sv.assetId}`} className="text-blue-600 hover:underline">{sv.asset.name}</Link> : '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Technician</span>
                <span className="font-medium">{sv.technician?.name || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
