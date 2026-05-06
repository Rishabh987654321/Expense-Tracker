import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { useExpense, useDeleteExpense } from '@/api/expenses';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatMoney } from '@/lib/format';
import { api, apiErrorMessage } from '@/api/client';
import { tenantPath } from '@/lib/tenant';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statusVariant = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: e, isLoading, isError, error } = useExpense(id);
  const deleteMutation = useDeleteExpense();
  const user = useAuthStore((s) => s.user);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canDelete =
    e &&
    e.status === 'PENDING' &&
    (e.submitter?.id === user?.userId || user?.role === 'ADMIN');

  const onDelete = async () => {
    try {
      await deleteMutation.mutateAsync(e.id);
      toast.success('Expense deleted');
      navigate('/expenses');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const openReceipt = async () => {
    try {
      if (!e?.receiptUrl) return;
      const res = await api.get(e.receiptUrl, { responseType: 'blob' });
      const objUrl = URL.createObjectURL(res.data);
      window.open(objUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !e) {
    return (
      <div className="text-sm text-destructive">{error?.message || 'Expense not found'}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={tenantPath('/expenses')} className='flex items-center'><ArrowLeft className="size-4 mr-1" />Back to expenses</Link>
        </Button>
        {canDelete ? (
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} disabled={deleteMutation.isPending}>
            <Trash2 className="size-4 mr-1" />
            Delete
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-xl">
                {formatMoney(e.amountCents, e.currency)} · {e.category}
              </CardTitle>
              <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Date" value={formatDate(e.expenseDate)} />
              <Field label="Submitter" value={`${e.submitter?.name} (${e.submitter?.email})`} />
              <Field label="Submitted at" value={formatDate(e.createdAt)} />
              <Field label="Currency" value={e.currency} />
            </div>
            <Separator />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Description</div>
              <div className="mt-1 whitespace-pre-wrap">{e.description}</div>
            </div>

            {e.receiptUrl ? (
              <>
                <Separator />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Receipt</div>
                  <button
                    type="button"
                    onClick={openReceipt}
                    className="inline-flex items-center gap-2 text-sm underline"
                  >
                    <FileText className="size-4" />
                    Open receipt
                  </button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Approval history</CardTitle></CardHeader>
          <CardContent>
            {e.approvals?.length ? (
              <ul className="space-y-3 text-sm">
                {e.approvals.map((a) => (
                  <li key={a.id} className="border-l-2 pl-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{a.approver?.name}</span>
                      <Badge variant={statusVariant[a.decision]}>{a.decision}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(a.decidedAt)}</div>
                    {a.note ? <div className="mt-1 italic">"{a.note}"</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">
                No decisions yet. Awaiting a manager.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete expense</DialogTitle>
            <DialogDescription>
              This will permanently delete the expense while it is still pending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                await onDelete();
                setDeleteOpen(false);
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
