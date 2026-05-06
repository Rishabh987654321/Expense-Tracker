import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useAdminRequests({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin-requests'],
    enabled,
    queryFn: async () => (await api.get('/api/admin-requests')).data,
  });
}

export function useCreateAdminRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/api/admin-requests', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-requests'] }),
  });
}

export function useDecideAdminRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision }) =>
      (await api.post(`/api/admin-requests/${id}/decide`, { decision })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-requests'] }),
  });
}

export function useCancelAdminRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/api/admin-requests/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-requests'] }),
  });
}

