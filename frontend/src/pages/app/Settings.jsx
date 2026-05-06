import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/api/client';
import { useDeleteAvatar, useMyProfile, useUpdateMyProfile, useUploadAvatar } from '@/api/me';
import { useTeam } from '@/api/team';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAdminRequest } from '@/api/adminRequests';

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

export default function Settings() {
  const org = useAuthStore((s) => s.org);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef(null);
  const [avatarObjUrl, setAvatarObjUrl] = useState(null);
  const avatarObjUrlRef = useRef(null);
  const { data: meData } = useMyProfile({ enabled: Boolean(user) });
  const updateMe = useUpdateMyProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const createReq = useCreateAdminRequest();
  const { data: teamData } = useTeam();

  const current = meData?.user || user;
  const isEmployee = (current?.role || user?.role) === 'EMPLOYEE';
  const isAdmin = (current?.role || user?.role) === 'ADMIN';
  const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(current?.role || user?.role);

  const users = teamData?.users || [];
  const admins = users.filter((u) => u.role === 'ADMIN');
  const nonEmployees = users.filter((u) => u.role !== 'EMPLOYEE');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!current?.avatarUrl) {
        if (avatarObjUrlRef.current) {
          try { URL.revokeObjectURL(avatarObjUrlRef.current); } catch {}
          avatarObjUrlRef.current = null;
        }
        setAvatarObjUrl(null);
        return;
      }
      try {
        const res = await api.get(current.avatarUrl, { responseType: 'blob' });
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
  }, [current?.avatarUrl]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization and account information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>These values were set when the org was created.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label>Name</Label>
            <Input value={org?.name || ''} readOnly />
          </div>
          <div className="grid gap-1">
            <Label>Subdomain</Label>
            <Input value={org?.slug || ''} readOnly className="font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center gap-4">
            <Avatar className="size-12" size="lg">
              {avatarObjUrl ? <AvatarImage src={avatarObjUrl} alt={current?.name || 'avatar'} /> : null}
              <AvatarFallback>{initials(current?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await uploadAvatar.mutateAsync(file);
                    toast.success('Profile picture updated');
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploadAvatar.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploadAvatar.isPending ? 'Uploading…' : 'Upload picture'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!current?.avatarUrl || deleteAvatar.isPending}
                onClick={async () => {
                  try {
                    await deleteAvatar.mutateAsync();
                    if (avatarObjUrlRef.current) {
                      try { URL.revokeObjectURL(avatarObjUrlRef.current); } catch {}
                      avatarObjUrlRef.current = null;
                    }
                    setAvatarObjUrl(null);
                    toast.success('Profile picture removed');
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                  }
                }}
              >
                {deleteAvatar.isPending ? 'Removing…' : 'Remove'}
              </Button>
              <div className="text-xs text-muted-foreground">PNG/JPG/WEBP up to 3MB.</div>
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Name</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={current?.name || ''}
                onBlur={async (e) => {
                  const next = e.target.value.trim();
                  if (!next || next === current?.name) return;
                  try {
                    await updateMe.mutateAsync({ name: next });
                    toast.success('Profile updated');
                  } catch (err) {
                    toast.error(apiErrorMessage(err));
                  }
                }}
              />
              <Button
                variant="outline"
                disabled={updateMe.isPending}
                onClick={async () => {
                  // no-op helper: blur handler does the update
                  toast.message('Tip: edit the name field, then click outside it to save.');
                }}
              >
                Save
              </Button>
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Email</Label>
            <Input value={current?.email || user?.email || ''} readOnly />
          </div>
          <div className="grid gap-1">
            <Label>Role</Label>
            <div><Badge variant="outline">{current?.role || user?.role}</Badge></div>
          </div>
        </CardContent>
      </Card>

      {isManagerOrAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>
              Managers can request admin access from an existing admin. Admins can transfer admin to another user.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isAdmin ? (
              <>
                <div className="grid gap-1">
                  <Label>Request admin access from</Label>
                  <Select
                    onValueChange={async (targetUserId) => {
                      try {
                        await createReq.mutateAsync({
                          type: 'REQUEST_ADMIN_ACCESS',
                          targetUserId,
                        });
                        toast.success('Request sent');
                      } catch (err) {
                        toast.error(apiErrorMessage(err));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick an admin" /></SelectTrigger>
                    <SelectContent>
                      {admins.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    You’ll become admin only if the targeted admin accepts.
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-1">
                <Label>Transfer admin to</Label>
                <Select
                  onValueChange={async (targetUserId) => {
                    try {
                      await createReq.mutateAsync({
                        type: 'TRANSFER_ADMIN',
                        targetUserId,
                      });
                      toast.success('Transfer request sent');
                    } catch (err) {
                      toast.error(apiErrorMessage(err));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pick a user (not employee)" /></SelectTrigger>
                  <SelectContent>
                    {nonEmployees
                      .filter((u) => u.id !== current?.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  The recipient must accept before they become admin.
                </div>
              </div>
            )}

            {isEmployee ? (
              <div className="text-sm text-muted-foreground sm:col-span-2">
                Employees can edit their profile, but cannot request admin access.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
