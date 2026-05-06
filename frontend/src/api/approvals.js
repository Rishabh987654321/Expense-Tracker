import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => (await api.get('/api/approvals/pending')).data,
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, note }) => {
      const path = decision === 'APPROVED' ? 'approve' : 'reject';
      return (await api.post(`/api/approvals/${id}/${path}`, { note })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
