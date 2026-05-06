import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getTenantInfo } from '@/lib/tenant';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import RoleRoute from '@/components/common/RoleRoute';
import AppShell from '@/components/layout/AppShell';

const Landing       = lazy(() => import('@/pages/public/Landing'));
const OrgSignup     = lazy(() => import('@/pages/public/OrgSignup'));
const Login         = lazy(() => import('@/pages/public/Login'));
const AcceptInvite  = lazy(() => import('@/pages/public/AcceptInvite'));
const NotFound      = lazy(() => import('@/pages/public/NotFound'));

const Dashboard     = lazy(() => import('@/pages/app/Dashboard'));
const ExpensesList  = lazy(() => import('@/pages/app/ExpensesList'));
const NewExpense    = lazy(() => import('@/pages/app/NewExpense'));
const ExpenseDetail = lazy(() => import('@/pages/app/ExpenseDetail'));
const Approvals     = lazy(() => import('@/pages/app/Approvals'));
const Team          = lazy(() => import('@/pages/app/Team'));
const Settings      = lazy(() => import('@/pages/app/Settings'));

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export default function AppRoutes() {
  const { isPublic, slug } = getTenantInfo();
  const isAuthed = useAuthStore((s) => Boolean(s.token));

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {isPublic ? (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<OrgSignup />} />
            <Route path="/login" element={<Login publicHost />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="*" element={<NotFound />} />
          </>
        ) : (
          <>
            <Route
              path="/login"
              element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login slug={slug} />}
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<ExpensesList />} />
              <Route path="/expenses/new" element={<NewExpense />} />
              <Route path="/expenses/:id" element={<ExpenseDetail />} />
              <Route
                path="/approvals"
                element={
                  <RoleRoute allow={['ADMIN', 'MANAGER']}>
                    <Approvals />
                  </RoleRoute>
                }
              />
              <Route
                path="/team"
                element={
                  <RoleRoute allow={['ADMIN', 'MANAGER', 'EMPLOYEE']}>
                    <Team />
                  </RoleRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleRoute allow={['ADMIN', 'MANAGER', 'EMPLOYEE']}>
                    <Settings />
                  </RoleRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </>
        )}
      </Routes>
    </Suspense>
  );
}
