import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { getTenantInfo, publicUrl, tenantPath } from '@/lib/tenant';

export const api = axios.create({
  // If VITE_API_URL isn't set, fall back to the current hostname in dev so
  // opening the app via http://<ip>:5173 will call http://<ip>:4000.
  baseURL:
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:4000`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const { slug } = getTenantInfo();
  if (slug) {
    config.headers['X-Tenant-Slug'] = slug;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const { token, clear } = useAuthStore.getState();
      if (token) {
        clear();
        // Bounce back to login for the current tenant, or to public signup if
        // we were already on the public host.
        const { slug } = getTenantInfo();
        if (slug) {
          window.location.href = tenantPath('/login');
        } else {
          window.location.href = publicUrl('/login-help');
        }
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong'
  );
}
