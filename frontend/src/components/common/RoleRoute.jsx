import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function RoleRoute({ allow = [], children }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}
