import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useTeam() {
  return useQuery({
    queryKey: ['team', 'users'],
    queryFn: async () => (await api.get('/api/users')).data,
  });
}

export function useInvites({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['team', 'invites'],
    enabled,
    queryFn: async () => (await api.get('/api/invites')).data,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/api/invites', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/api/invites/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }) => (await api.patch(`/api/users/${id}/role`, { role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/api/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
