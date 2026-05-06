import { api } from './client';
import { useQuery } from '@tanstack/react-query';

export function useAnalyticsSummary(range = {}) {
  return useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: async () => (await api.get('/api/analytics/summary', { params: range })).data,
  });
}

export function useByCategory(range = {}) {
  return useQuery({
    queryKey: ['analytics', 'by-category', range],
    queryFn: async () => (await api.get('/api/analytics/by-category', { params: range })).data,
  });
}

export function useByUser(range = {}) {
  return useQuery({
    queryKey: ['analytics', 'by-user', range],
    queryFn: async () => (await api.get('/api/analytics/by-user', { params: range })).data,
  });
}

export function useByMonth(range = {}) {
  return useQuery({
    queryKey: ['analytics', 'by-month', range],
    queryFn: async () => (await api.get('/api/analytics/by-month', { params: range })).data,
  });
}
