import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filter.store';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useDashboard(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({ 
    queryKey: ['dashboard', params, selectedBranches], 
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/dashboard', { params });
        if (r.data?.data) return r.data.data;
      } catch (err) {}

      // Fallback: Calculate metrics directly from Supabase for Vercel Serverless environment
      const branchFilter = params?.branchId;
      const sb = selectedBranches;
      
      const [
        { count: totalAssets },
        { count: operationalAssets },
        { count: breakdownAssets },
        { count: openIssues },
        { count: criticalIssues },
        { count: inProgressVisits }
      ] = await Promise.all([
        
(sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['OPERATIONAL', 'BREAKDOWN', 'MAINTENANCE', 'DECOMMISSIONED']).in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['OPERATIONAL', 'BREAKDOWN', 'MAINTENANCE', 'DECOMMISSIONED'])),

        (sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL').in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL')),
        (sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'BREAKDOWN').in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'BREAKDOWN')),
        (sb.length > 0 ? supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN').in('branchId', sb) : supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN')),
        (sb.length > 0 ? supabase.from('issues').select('*', { count: 'exact', head: true }).eq('priority', 'CRITICAL').neq('status', 'RESOLVED').in('branchId', sb) : supabase.from('issues').select('*', { count: 'exact', head: true }).eq('priority', 'CRITICAL').neq('status', 'RESOLVED')),
        (sb.length > 0 ? supabase.from('service_visits').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS').in('branchId', sb) : supabase.from('service_visits').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS')),
      ]);

      return {
        summary: {
          totalAssets: totalAssets || 0,
          operationalAssets: operationalAssets || 0,
          breakdownAssets: breakdownAssets || 0,
          openIssues: openIssues || 0,
          criticalIssues: criticalIssues || 0,
          inProgressVisits: inProgressVisits || 0,
          pmDue: 0,
          pmOverdue: 0,
          slaBreaches: 0,
          monthCost: 0,
          ytdCost: 0,
        },
        userStats: {
          openTickets: openIssues || 0,
          resolvedTickets: 0,
          pendingApprovals: 0
        },
        trends: {
          costData: [],
          issueData: []
        },
        recentActivity: []
      };
    } 
  });
}
