import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, FilePlus2, ListChecks, Users, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { tenantPath } from '@/lib/tenant';

const items = [
  { to: '/dashboard',       label: 'Dashboard',  icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/expenses',        label: 'Expenses',   icon: Receipt,         roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/expenses/new',    label: 'New expense', icon: FilePlus2,      roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/approvals',       label: 'Approvals',  icon: ListChecks,      roles: ['ADMIN', 'MANAGER'] },
  { to: '/team',            label: 'Team',       icon: Users,           roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/settings',        label: 'Settings',   icon: Settings,        roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
];

export default function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const org = useAuthStore((s) => s.org);

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 border-b">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Organization</div>
        <div className="mt-1 text-base font-semibold truncate">{org?.name || '—'}</div>
        <div className="text-xs text-muted-foreground">{org?.slug || ''}</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items
          .filter((i) => !role || i.roles.includes(role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={tenantPath(to)}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
