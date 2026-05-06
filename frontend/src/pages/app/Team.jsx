import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useTeam,
  useInvites,
  useCreateInvite,
  useRevokeInvite,
  useUpdateUserRole,
  useDeleteUser,
} from '@/api/team';
import {
  useAdminRequests,
  useCancelAdminRequest,
  useCreateAdminRequest,
  useDecideAdminRequest,
} from '@/api/adminRequests';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, formatDate } from '@/lib/format';
import { apiErrorMessage } from '@/api/client';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});

export default function Team() {
  const me = useAuthStore((s) => s.user);
  const isEmployee = me?.role === 'EMPLOYEE';
  const { data: usersData, isLoading: loadingUsers } = useTeam();
  const { data: invitesData, isLoading: loadingInvites } = useInvites({ enabled: !isEmployee });
  const { data: reqData, isLoading: loadingReqs } = useAdminRequests({ enabled: !isEmployee });
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const createReq = useCreateAdminRequest();
  const decideReq = useDecideAdminRequest();
  const cancelReq = useCancelAdminRequest();

  const [open, setOpen] = useState(false);
  const [lastInvite, setLastInvite] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'EMPLOYEE' },
  });

  const onInvite = async (values) => {
    try {
      const result = await createInvite.mutateAsync(values);
      setLastInvite(result);
      toast.success(`Invite sent to ${values.email}`);
      form.reset();
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const onChangeRole = async (id, role) => {
    try {
      await updateRole.mutateAsync({ id, role });
      toast.success('Role updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const users = usersData?.users || [];
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const myId = me?.userId || me?.id;
  const requests = reqData?.items || [];
  const inbox = requests.filter((r) => r.status === 'PENDING' && r.targetUser?.id === myId);
  const outbox = requests.filter((r) => r.status === 'PENDING' && r.createdBy?.id === myId);

  const onDelete = (u) => {
    setDeleteTarget(u);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast.success('User removed');
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const onRevoke = async (id) => {
    try {
      await revokeInvite.mutateAsync(id);
      toast.success('Invite revoked');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const isAdmin = me?.role === 'ADMIN';
  const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(me?.role);
  const admins = users.filter((u) => u.role === 'ADMIN');
  const nonEmployees = users.filter((u) => u.role !== 'EMPLOYEE');

  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">Team</h1>
          <p className="text-sm text-muted-foreground">
            Members of your organization. You can view the directory but cannot change roles or invites.
          </p>
        </div>
        <Card>
          <div className="px-4 py-3 border-b font-medium text-sm">Members</div>
          {loadingUsers ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.name}
                      {u.id === me?.userId ? <Badge variant="secondary" className="ml-2">You</Badge> : null}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">Team</h1>
          <p className="text-sm text-muted-foreground">Members of your organization and pending invites.</p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4 mr-1" /> Invite member
          </Button>
        ) : null}
      </div>

      {lastInvite ? (
        <Card className="p-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            Invite created for <span className="font-medium">{lastInvite.email}</span>. In dev mode, the
            email is logged on the server. You can also share this link directly:
            <div className="mt-1 font-mono text-xs break-all bg-muted rounded px-2 py-1">{lastInvite.acceptUrl}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(lastInvite.acceptUrl);
              toast.success('Copied');
            }}
          >
            <Copy className="size-4 mr-1" />
            Copy link
          </Button>
        </Card>
      ) : null}

      <Card>
        <div className="px-4 py-3 border-b font-medium text-sm">Members</div>
        {loadingUsers ? (
          <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}{u.id === me?.userId ? <Badge variant="secondary" className="ml-2">You</Badge> : null}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    {isAdmin && u.id !== me?.userId ? (
                      <Select value={u.role} onValueChange={(v) => onChangeRole(u.id, v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{u.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && u.id !== me?.userId ? (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(u)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isManagerOrAdmin ? (
        <Card>
          <div className="px-4 py-3 border-b font-medium text-sm">Admin requests</div>
          {loadingReqs ? (
            <div className="p-4 space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Incoming</div>
                  {!inbox.length ? (
                    <div className="text-sm text-muted-foreground">No pending requests.</div>
                  ) : (
                    <div className="space-y-3">
                      {inbox.map((r) => (
                        <div key={r.id} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              {r.type === 'TRANSFER_ADMIN' ? 'Transfer admin' : 'Admin access request'}
                            </div>
                            <Badge variant="outline">PENDING</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From <span className="font-medium text-foreground">{r.createdBy?.name}</span>
                            {r.note ? <div className="mt-1">Note: {r.note}</div> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await decideReq.mutateAsync({ id: r.id, decision: 'ACCEPTED' });
                                  toast.success('Accepted');
                                } catch (err) {
                                  toast.error(apiErrorMessage(err));
                                }
                              }}
                              disabled={decideReq.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await decideReq.mutateAsync({ id: r.id, decision: 'REJECTED' });
                                  toast.success('Rejected');
                                } catch (err) {
                                  toast.error(apiErrorMessage(err));
                                }
                              }}
                              disabled={decideReq.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Outgoing</div>
                  {!outbox.length ? (
                    <div className="text-sm text-muted-foreground">No pending requests.</div>
                  ) : (
                    <div className="space-y-3">
                      {outbox.map((r) => (
                        <div key={r.id} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              {r.type === 'TRANSFER_ADMIN' ? 'Transfer admin' : 'Admin access request'}
                            </div>
                            <Badge variant="outline">PENDING</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            To <span className="font-medium text-foreground">{r.targetUser?.name}</span>
                            {r.note ? <div className="mt-1">Note: {r.note}</div> : null}
                          </div>
                          <div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                try {
                                  await cancelReq.mutateAsync(r.id);
                                  toast.success('Request cancelled');
                                } catch (err) {
                                  toast.error(apiErrorMessage(err));
                                }
                              }}
                              disabled={cancelReq.isPending}
                            >
                              Cancel request
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">Create request</div>
                {me?.role === 'MANAGER' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label>Request admin access from</Label>
                      <Select
                        onValueChange={async (targetUserId) => {
                          try {
                            await createReq.mutateAsync({ type: 'REQUEST_ADMIN_ACCESS', targetUserId });
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
                    </div>
                  </div>
                ) : isAdmin ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label>Transfer admin to</Label>
                      <Select
                        onValueChange={async (targetUserId) => {
                          try {
                            await createReq.mutateAsync({ type: 'TRANSFER_ADMIN', targetUserId });
                            toast.success('Transfer request sent');
                          } catch (err) {
                            toast.error(apiErrorMessage(err));
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Pick a user (not employee)" /></SelectTrigger>
                        <SelectContent>
                          {nonEmployees
                            .filter((u) => u.id !== myId)
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  You're about to remove <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email})
                  from this organization.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget?.id === me?.userId ? (
            <div className="text-sm text-destructive">
              You can’t remove yourself. Use “Log out” instead.
            </div>
          ) : null}

          {deleteTarget?.role === 'ADMIN' ? (
            <div className="text-sm">
              <div className="font-medium">This user is an Admin.</div>
              {adminCount <= 1 ? (
                <div className="text-destructive mt-1">
                  You can’t remove the last admin of an organization.
                </div>
              ) : (
                <div className="text-muted-foreground mt-1">
                  Make sure another admin remains to manage team access.
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={
                deleteUser.isPending ||
                !deleteTarget ||
                deleteTarget.id === me?.userId ||
                (deleteTarget.role === 'ADMIN' && adminCount <= 1)
              }
            >
              {deleteUser.isPending ? 'Removing…' : 'Remove member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin ? (
        <Card>
          <div className="px-4 py-3 border-b font-medium text-sm">Pending invites</div>
          {loadingInvites ? (
            <div className="p-4 space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !invitesData?.invites?.length ? (
            <div className="p-6 text-sm text-muted-foreground">No pending invites.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitesData.invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell><Badge variant="outline">{i.role}</Badge></TableCell>
                    <TableCell>{formatDate(i.createdAt)}</TableCell>
                    <TableCell>{formatDate(i.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(i.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to set their password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} placeholder="teammate@company.com" />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.watch('role')} onValueChange={(v) => form.setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createInvite.isPending}>
                {createInvite.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
