import { api } from './client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

export function useSignupOrg() {
  return useMutation({
    mutationFn: async (payload) => (await api.post('/api/auth/signup-org', payload)).data,
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (payload) => (await api.post('/api/auth/login', payload)).data,
    onSuccess: (data) => setSession(data),
  });
}

export function useAcceptInvite() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (payload) => (await api.post('/api/auth/accept-invite', payload)).data,
    onSuccess: (data) => setSession(data),
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['me'],
    enabled,
    queryFn: async () => (await api.get('/api/auth/me')).data,
  });
}
