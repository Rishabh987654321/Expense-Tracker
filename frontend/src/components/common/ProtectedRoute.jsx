import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { tenantPath } from '@/lib/tenant';

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to={tenantPath('/login')} replace state={{ from: location }} />;
  }
  return children;
}
