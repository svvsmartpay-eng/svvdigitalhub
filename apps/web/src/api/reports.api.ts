import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Backend route: GET /reports/assets
export function useAssetRegister(params?: any) {
  return useQuery({
    queryKey: ['report-asset-register', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/assets', { params });
      return r.data.data;
    },
    enabled: false, // only run when explicitly triggered
  });
}

// Backend route: GET /reports/issue-aging
export function useIssueAging(params?: any) {
  return useQuery({
    queryKey: ['report-issue-aging', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/issue-aging', { params });
      return r.data.data;
    },
    enabled: false,
  });
}

// Backend route: GET /reports/sla-compliance
export function useSLACompliance(params?: any) {
  return useQuery({
    queryKey: ['report-sla-compliance', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/sla-compliance', { params });
      return r.data.data;
    },
    enabled: false,
  });
}

// Backend route: GET /reports/vendor-performance
export function useVendorPerformanceReport(params?: any) {
  return useQuery({
    queryKey: ['report-vendor-performance', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/vendor-performance', { params });
      return r.data.data;
    },
    enabled: false,
  });
}

// Backend route: GET /reports/pm-compliance
export function usePMCompliance(params?: any) {
  return useQuery({
    queryKey: ['report-pm-compliance', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/pm-compliance', { params });
      return r.data.data;
    },
    enabled: false,
  });
}

// Backend route: GET /reports/costs (NOT /reports/cost-report)
export function useCostReport(params?: any) {
  return useQuery({
    queryKey: ['report-cost-report', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/costs', { params });
      return r.data.data;
    },
    enabled: false,
  });
}

// Backend route: GET /reports/expiring-contracts
export function useExpiringContracts(params?: any) {
  return useQuery({
    queryKey: ['report-expiring-contracts', params],
    queryFn: async () => {
      const r = await apiClient.get('/reports/expiring-contracts', { params });
      return r.data.data;
    },
    enabled: false,
  });
}
