import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

export default function StatsCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  onClick?: () => void;
  loading?: boolean;
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-[#1e3a5f]',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 select-none relative overflow-hidden',
        onClick &&
          'cursor-pointer hover:shadow-md hover:border-[#1e3a5f]/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs group'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 truncate">{label}</p>
              {onClick && (
                <ArrowUpRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-[#1e3a5f] transition-opacity shrink-0" />
              )}
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-gray-200 animate-pulse rounded mt-1.5" />
            ) : (
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1 font-mono tracking-tight">{value}</p>
            )}
            {trend && !loading && (
              <p className={cn('text-[11px] mt-1 font-medium', trend.value > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label || 'vs last month'}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn('p-2.5 md:p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105', colorMap[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
