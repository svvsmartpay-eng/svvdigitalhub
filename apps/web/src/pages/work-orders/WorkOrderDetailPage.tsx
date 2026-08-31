import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWorkOrder, useUpdateWorkOrderStatus, useApproveWorkOrder } from '@/api/workOrders.api';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const { data: wo, isLoading, isError, error, refetch } = useWorkOrder(id!);
  const updateStatus = useUpdateWorkOrderStatus();
  const approveWO = useApproveWorkOrder();
  const { user } = useAuthStore();

  if (isLoading) return <LoadingSpinner fullScreen />;
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-700 font-medium">Failed to load work order</p>
        <p className="text-red-500 text-sm">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!wo) return <div className="p-8 text-center text-gray-500">Work order not found.</div>;

  const handleStatusChange = (status: string) => {
    if (window.confirm(`Are you sure you want to change status to ${status}?`)) {
      updateStatus.mutate({ id: wo.id, status });
    }
  };

  const handleApprove = () => {
    if (window.confirm('Approve this work order?')) {
      approveWO.mutate(wo.id);
    }
  };

  const canApprove = (user?.primaryRole === 'ADMIN' || user?.primaryRole === 'SUPER_ADMIN') && wo.status === 'OPEN' && wo.requiresApproval;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={wo.title} 
        subtitle={wo.workOrderNo} 
        breadcrumbs={[{ label: 'Work Orders', href: '/work-orders' }, { label: wo.workOrderNo }]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={wo.status} />
            {canApprove && (
              <Button onClick={handleApprove} loading={approveWO.isPending} className="bg-green-600 hover:bg-green-700">Approve</Button>
            )}
            {wo.status === 'ASSIGNED' && (
              <Button onClick={() => handleStatusChange('IN_PROGRESS')} loading={updateStatus.isPending}>Start Work</Button>
            )}
            {wo.status === 'IN_PROGRESS' && (
              <Button onClick={() => handleStatusChange('COMPLETED')} loading={updateStatus.isPending} className="bg-green-600 hover:bg-green-700">Complete</Button>
            )}
          </div>
        } 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{wo.description}</p>
          </div>
          
          {wo.notes && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{wo.notes}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Details</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Priority</span>
                <span><StatusBadge status={wo.priority} size="sm" /></span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Branch</span>
                <span className="font-medium">{wo.branch?.name} ({wo.branch?.code})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Asset</span>
                <span className="font-medium">{wo.asset ? <Link to={`/assets/${wo.assetId}`} className="text-blue-600 hover:underline">{wo.asset.name}</Link> : '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Est. Cost</span>
                <span className="font-medium">${Number(wo.estimatedCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Created At</span>
                <span className="font-medium">{new Date(wo.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
