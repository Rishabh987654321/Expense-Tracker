import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { tenantPath } from '@/lib/tenant';

export default function RoleRoute({ allow = [], children }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to={tenantPath('/login')} replace />;
  if (!allow.includes(role)) return <Navigate to={tenantPath('/dashboard')} replace />;
  return children;
}
