import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string) {
  if (['OPERATIONAL', 'HEALTHY', 'COMPLETED', 'RESOLVED', 'CLOSED', 'APPROVED', 'VERIFIED'].includes(status)) return 'bg-green-100 text-green-800 border-green-200';
  if (['BREAKDOWN', 'CRITICAL', 'HIGH', 'DECOMMISSIONED', 'DISPOSED', 'REJECTED', 'FAIL'].includes(status)) return 'bg-red-100 text-red-800 border-red-200';
  if (['UNDER_MAINTENANCE', 'WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL', 'WATCH', 'AT_RISK', 'MEDIUM'].includes(status)) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
}
