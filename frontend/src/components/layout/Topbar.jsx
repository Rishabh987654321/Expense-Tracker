import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { publicUrl, tenantPath } from '@/lib/tenant';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/api/notifications';
import { apiErrorMessage } from '@/api/client';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Topbar({ onMenuClick }) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { data: notif, isLoading: notifLoading } = useNotifications({ enabled: Boolean(user) });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [avatarObjUrl, setAvatarObjUrl] = useState(null);
  const avatarObjUrlRef = useRef(null);

  const onLogout = () => {
    clear();
    window.location.href = tenantPath('/login');
  };

  const unreadCount = notif?.unreadCount || 0;
  const items = notif?.items || [];

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.avatarUrl) {
        if (avatarObjUrlRef.current) {
          try { URL.revokeObjectURL(avatarObjUrlRef.current); } catch {}
          avatarObjUrlRef.current = null;
        }
        setAvatarObjUrl(null);
        return;
      }
      try {
        const res = await api.get(user.avatarUrl, { responseType: 'blob' });
        const objUrl = URL.createObjectURL(res.data);
        if (!cancelled) {
          if (avatarObjUrlRef.current) {
            try { URL.revokeObjectURL(avatarObjUrlRef.current); } catch {}
          }
          avatarObjUrlRef.current = objUrl;
          setAvatarObjUrl(objUrl);
        } else {
          try { URL.revokeObjectURL(objUrl); } catch {}
        }
      } catch {
        if (!cancelled) setAvatarObjUrl(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.avatarUrl]);

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        {onMenuClick ? (
          <button
            type="button"
            aria-label="Open menu"
            onClick={onMenuClick}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
          >
            <Menu className="size-5" />
          </button>
        ) : null}
        <span className="text-sm font-medium">Expense Tracker</span>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-accent">
                  <Bell className="size-5" />
                  {unreadCount ? (
                    <span className="absolute -top-0.5 -right-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1 leading-4 min-w-4 text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={!unreadCount || markAll.isPending}
                    onClick={async () => {
                      try {
                        await markAll.mutateAsync();
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      }
                    }}
                  >
                    Mark all read
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Loading…</div>
                ) : !items.length ? (
                  <div className="p-3 text-sm text-muted-foreground">No notifications yet.</div>
                ) : (
                  items.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-0.5"
                      onClick={async () => {
                        try {
                          if (!n.readAt) await markRead.mutateAsync(n.id);
                        } catch (err) {
                          toast.error(apiErrorMessage(err));
                        }
                      }}
                    >
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className={n.readAt ? 'font-medium' : 'font-semibold'}>
                          {n.title}
                        </span>
                        {!n.readAt ? <span className="text-[10px] text-primary">New</span> : null}
                      </div>
                      {n.body ? <span className="text-xs text-muted-foreground">{n.body}</span> : null}
                      {n?.data?.expenseId ? (
                        <button
                          type="button"
                          className="text-xs underline text-primary mt-1"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              if (!n.readAt) await markRead.mutateAsync(n.id);
                            } catch (err) {
                              toast.error(apiErrorMessage(err));
                            }
                            window.location.href = `/expenses/${n.data.expenseId}`;
                          }}
                        >
                          View
                        </button>
                      ) : n?.data?.adminRequestId ? (
                        <button
                          type="button"
                          className="text-xs underline text-primary mt-1"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              if (!n.readAt) await markRead.mutateAsync(n.id);
                            } catch (err) {
                              toast.error(apiErrorMessage(err));
                            }
                            window.location.href = tenantPath('/team');
                          }}
                        >
                          View
                        </button>
                      ) : n?.data?.navigateTo === 'team' ||
                        n?.type === 'NEW_TEAM_MEMBER' ||
                        n?.type === 'INVITE_ACCEPTED' ||
                        n?.type === 'INVITE_REVOKED' ? (
                        <button
                          type="button"
                          className="text-xs underline text-primary mt-1"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              if (!n.readAt) await markRead.mutateAsync(n.id);
                            } catch (err) {
                              toast.error(apiErrorMessage(err));
                            }
                            window.location.href = tenantPath('/team');
                          }}
                        >
                          View
                        </button>
                      ) : null}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-accent">
                  <Avatar className="size-8">
                    {avatarObjUrl ? <AvatarImage src={avatarObjUrl} alt={user.name} /> : null}
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{user.name}</span>
                    <Badge variant="secondary" className="text-[10px] py-0">{user.role}</Badge>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => (window.location.href = publicUrl('/'))}>
                  Switch organization
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="size-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = publicUrl('/login'))}>
            Log in
          </Button>
        )}
      </div>
    </header>
  );
}
