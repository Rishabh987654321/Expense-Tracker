import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

export function useMyProfile({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['me-profile'],
    enabled,
    queryFn: async () => (await api.get('/api/me')).data,
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const org = useAuthStore((s) => s.org);

  return useMutation({
    mutationFn: async (payload) => (await api.patch('/api/me', payload)).data,
    onSuccess: (data) => {
      if (data?.user) setSession({ token, org, user: data.user });
      qc.invalidateQueries({ queryKey: ['me-profile'] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const org = useAuthStore((s) => s.org);

  return useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return (await api.post('/api/me/avatar', fd)).data;
    },
    onSuccess: (data) => {
      if (data?.user) setSession({ token, org, user: data.user });
      qc.invalidateQueries({ queryKey: ['me-profile'] });
    },
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const org = useAuthStore((s) => s.org);

  return useMutation({
    mutationFn: async () => (await api.delete('/api/me/avatar')).data,
    onSuccess: (data) => {
      if (data?.user) setSession({ token, org, user: data.user });
      qc.invalidateQueries({ queryKey: ['me-profile'] });
    },
  });
}

