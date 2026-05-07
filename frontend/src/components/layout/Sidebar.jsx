import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FilePlus2,
  ListChecks,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { tenantPath } from '@/lib/tenant';

const items = [
  { to: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/expenses',     label: 'Expenses',    icon: Receipt,         roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/expenses/new', label: 'New expense', icon: FilePlus2,       roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/approvals',    label: 'Approvals',   icon: ListChecks,      roles: ['ADMIN', 'MANAGER'] },
  { to: '/team',         label: 'Team',        icon: Users,           roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/settings',     label: 'Settings',    icon: Settings,        roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
];

function SidebarContent({ role, org, onNavigate }) {
  return (
    <>
      <div className="px-5 py-5 border-b">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Organization</div>
        <div className="mt-1 text-base font-semibold truncate">{org?.name || '—'}</div>
        <div className="text-xs text-muted-foreground">{org?.slug || ''}</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items
          .filter((i) => !role || i.roles.includes(role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={tenantPath(to)}
              end={to === '/dashboard'}
              onClick={onNavigate}
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
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const role = useAuthStore((s) => s.user?.role);
  const org = useAuthStore((s) => s.org);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, onClose]);

  return (
    <>
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground">
        <SidebarContent role={role} org={org} />
      </aside>

      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        />
        <aside
          role="dialog"
          aria-modal="true"
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85%] bg-sidebar text-sidebar-foreground border-r shadow-xl flex flex-col',
            'transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <span className="text-sm font-medium">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
          <SidebarContent role={role} org={org} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
