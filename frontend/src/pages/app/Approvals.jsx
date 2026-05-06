import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { usePendingApprovals, useDecideApproval } from '@/api/approvals';
import { formatDate, formatMoney } from '@/lib/format';
import { api, apiErrorMessage } from '@/api/client';

export default function Approvals() {
  const { data, isLoading } = usePendingApprovals();
  const decide = useDecideApproval();
  const [pending, setPending] = useState(null); // { expense, decision }
  const [note, setNote] = useState('');
  const [receiptObjectUrls, setReceiptObjectUrls] = useState(() => new Map()); // receiptUrl -> objectUrl

  const open = (expense, decision) => {
    setPending({ expense, decision });
    setNote('');
  };

  const items = data?.items || [];

  // Prefetch image receipts (small set) so thumbnails render with auth.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const next = new Map(receiptObjectUrls);
      const toFetch = items
        .map((e) => e.receiptUrl)
        .filter(Boolean)
        .filter((u) => !String(u).toLowerCase().includes('.pdf'))
        .filter((u) => !next.has(u));

      // Keep it bounded.
      for (const u of toFetch.slice(0, 10)) {
        try {
          const res = await api.get(u, { responseType: 'blob' });
          const objUrl = URL.createObjectURL(res.data);
          next.set(u, objUrl);
          if (!cancelled) setReceiptObjectUrls(new Map(next));
        } catch {
          // ignore thumbnail failures
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    return () => {
      for (const objUrl of receiptObjectUrls.values()) {
        try { URL.revokeObjectURL(objUrl); } catch {}
      }
    };
  }, [receiptObjectUrls]);

  async function openReceipt(e) {
    if (!e?.receiptUrl) return;
    const isPdf = String(e.receiptUrl).toLowerCase().includes('.pdf');
    const res = await api.get(e.receiptUrl, { responseType: 'blob' });
    const objUrl = URL.createObjectURL(res.data);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    // Revoke after a bit (give the new tab time to load).
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
  }

  const onConfirm = async () => {
    try {
      await decide.mutateAsync({
        id: pending.expense.id,
        decision: pending.decision,
        note: note.trim() || undefined,
      });
      toast.success(`Expense ${pending.decision.toLowerCase()}`);
      setPending(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Pending expenses across your organization. Approve or reject each one.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.items?.length ? (
          <EmptyState title="Inbox zero" description="No pending expenses to review right now." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.expenseDate)}</TableCell>
                  <TableCell>
                    <div className="leading-tight">
                      <div>{e.submitter?.name}</div>
                      <div className="text-xs text-muted-foreground">{e.submitter?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                  <TableCell>
                    {e.receiptUrl ? (
                      (() => {
                        const isPdf = String(e.receiptUrl).toLowerCase().includes('.pdf');
                        const thumb = receiptObjectUrls.get(e.receiptUrl);
                        return (
                          <button
                            type="button"
                            onClick={() => openReceipt(e)}
                            className="inline-flex items-center gap-2"
                          >
                            {isPdf ? (
                              <span className="text-sm underline">Open PDF</span>
                            ) : (
                              <img
                                alt="Receipt preview"
                                src={thumb || ''}
                                className="h-10 w-10 rounded object-cover border bg-background"
                                loading="lazy"
                              />
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(e.amountCents, e.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => open(e, 'REJECTED')}>
                        <X className="size-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => open(e, 'APPROVED')}>
                        <Check className="size-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.decision === 'APPROVED' ? 'Approve expense' : 'Reject expense'}
            </DialogTitle>
            <DialogDescription>
              {pending ? (
                <>
                  {pending.expense.submitter?.name} ·{' '}
                  {formatMoney(pending.expense.amountCents, pending.expense.currency)} ·{' '}
                  {pending.expense.category}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to the submitter in their notification email" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button
              variant={pending?.decision === 'APPROVED' ? 'default' : 'destructive'}
              onClick={onConfirm}
              disabled={decide.isPending}
            >
              {decide.isPending
                ? 'Saving…'
                : pending?.decision === 'APPROVED' ? 'Confirm approve' : 'Confirm reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
