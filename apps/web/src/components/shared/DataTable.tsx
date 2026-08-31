import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  loading,
  onRowClick,
  emptyMessage = 'No records found matching your filters.',
  className,
}: {
  columns: Array<{
    key: string;
    header: string;
    render?: (row: any) => React.ReactNode;
    className?: string;
  }>;
  data: any[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  className?: string;
}) {
  const tableData = Array.isArray(data) ? data : (data as any)?.data || [];

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="p-4 space-y-3">
          <div className="flex gap-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24 ml-auto" />
          </div>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or active filter tabs.</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs', className)}>
      <table className="w-full caption-bottom text-xs text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('h-10 px-4 py-2 font-medium whitespace-nowrap', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tableData.map((row: any, i: number) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                'transition-colors duration-150',
                onRowClick
                  ? 'cursor-pointer hover:bg-blue-50/50 hover:text-gray-900 group'
                  : 'hover:bg-gray-50/60'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3 align-middle text-gray-700', col.className)}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
