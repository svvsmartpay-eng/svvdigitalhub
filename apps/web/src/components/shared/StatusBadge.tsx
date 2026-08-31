import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational', BREAKDOWN: 'Breakdown', UNDER_MAINTENANCE: 'Under Maintenance',
  DECOMMISSIONED: 'Decommissioned', DISPOSED: 'Disposed', INACTIVE: 'Inactive',
  OPEN: 'Open', REVIEWED: 'Reviewed', WORK_ORDER_CREATED: 'WO Created', ASSIGNED: 'Assigned',
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In Progress', WAITING_FOR_PARTS: 'Waiting Parts',
  WAITING_FOR_APPROVAL: 'Pending Approval', RESOLVED: 'Resolved', VERIFIED: 'Verified',
  CLOSED: 'Closed', CANCELLED: 'Cancelled', CHECKED_IN: 'Checked In',
  CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
  HEALTHY: 'Healthy', WATCH: 'Watch', AT_RISK: 'At Risk', COMPLETED: 'Completed',
  DRAFT: 'Draft', APPROVED: 'Approved', REJECTED: 'Rejected', PENDING: 'Pending',
};

function getStatusVariant(status: string) {
  if (['OPERATIONAL', 'HEALTHY', 'COMPLETED', 'RESOLVED', 'CLOSED', 'APPROVED', 'VERIFIED'].includes(status)) return 'success';
  if (['BREAKDOWN', 'CRITICAL', 'HIGH', 'DECOMMISSIONED', 'DISPOSED', 'REJECTED', 'FAIL'].includes(status)) return 'destructive';
  if (['UNDER_MAINTENANCE', 'WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL', 'WATCH', 'AT_RISK', 'MEDIUM'].includes(status)) return 'warning';
  return 'default';
}

export default function StatusBadge({ status, size = 'default' }: { status: string; size?: 'sm' | 'default' }) {
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');
  const variant = getStatusVariant(status);
  return (
    <Badge variant={variant as any} className={size === 'sm' ? 'px-2 py-0' : ''}>
      {label}
    </Badge>
  );
}
