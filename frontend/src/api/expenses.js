import { api } from './client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useExpenses(filters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => (await api.get('/api/expenses', { params: filters })).data,
  });
}

export function useExpense(id) {
  return useQuery({
    queryKey: ['expense', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/api/expenses/${id}`)).data,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, file }) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      if (file) fd.append('receipt', file);
      const res = await api.post('/api/expenses', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/api/expenses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function buildExportUrl(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();
  return `${import.meta.env.VITE_API_URL || ''}/api/exports/expenses.csv${qs ? `?${qs}` : ''}`;
}
