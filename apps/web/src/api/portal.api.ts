import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/api';

// Base API URL for public portal calls
const API_BASE = '/api/v1';

export function usePortalTicket(token: string) {
  return useQuery({
    queryKey: ['portal-ticket', token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/portal/service/${token}`);
      return res.data.data;
    },
    enabled: !!token,
    retry: 1,
  });
}

export function useSubmitPortalUpdate(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      techName: string;
      techPhone?: string;
      company?: string;
      status: 'IN_PROGRESS' | 'RESOLVED' | 'WAITING_FOR_PARTS';
      diagnosisNote?: string;
      actionsTaken?: string;
      checklist?: any[];
      partsUsed?: Array<{ name: string; quantity: number }>;
      location?: { lat: number; lng: number; accuracy?: number };
      remarks?: string;
      photos?: File[];
    }) => {
      const formData = new FormData();
      formData.append('techName', payload.techName);
      if (payload.techPhone) formData.append('techPhone', payload.techPhone);
      if (payload.company) formData.append('company', payload.company);
      formData.append('status', payload.status);
      if (payload.diagnosisNote) formData.append('diagnosisNote', payload.diagnosisNote);
      if (payload.actionsTaken) formData.append('actionsTaken', payload.actionsTaken);
      if (payload.remarks) formData.append('remarks', payload.remarks);
      if (payload.location) formData.append('location', JSON.stringify(payload.location));

      if (payload.checklist) {
        formData.append('checklist', JSON.stringify(payload.checklist));
      }
      if (payload.partsUsed) {
        formData.append('partsUsed', JSON.stringify(payload.partsUsed));
      }
      if (payload.photos && payload.photos.length > 0) {
        payload.photos.forEach(file => formData.append('photos', file));
      }

      const res = await axios.post(`${API_BASE}/portal/service/${token}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-ticket', token] });
    },
  });
}

export function useGenerateServiceToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueId: string) => {
      const res = await apiClient.post(`/issues/${issueId}/service-token`);
      return res.data.data;
    },
    onSuccess: (_, issueId) => {
      qc.invalidateQueries({ queryKey: ['issue', issueId] });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}
