import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useNotifications({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['notifications'],
    enabled,
    queryFn: async () => (await api.get('/api/notifications?limit=20')).data,
    // Keep this lightweight; avoid retry loops that feel like "infinite calls"
    // when the backend has a transient error.
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/api/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/api/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

