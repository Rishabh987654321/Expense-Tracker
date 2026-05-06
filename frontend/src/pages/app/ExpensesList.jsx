import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FilePlus2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/common/EmptyState';
import { useExpenses, buildExportUrl } from '@/api/expenses';
import { useAuthStore } from '@/stores/authStore';
import { CATEGORIES, formatDate, formatMoney } from '@/lib/format';
import { api } from '@/api/client';

const STATUS_TABS = [
  { id: 'ALL',      label: 'All' },
  { id: 'PENDING',  label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
];

const statusVariant = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export default function ExpensesList() {
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const f = { page, pageSize: 20 };
    if (status !== 'ALL')   f.status = status;
    if (category !== 'ALL') f.category = category;
    if (from) f.from = from;
    if (to)   f.to = to;
    if (q.trim()) f.q = q.trim();
    return f;
  }, [status, category, from, to, q, page]);

  const exportFilters = useMemo(() => {
    const { page: _p, pageSize: _ps, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data, isLoading, isError, error } = useExpenses(filters);
  const role = useAuthStore((s) => s.user?.role);

  const onExport = () => {
    api
      .get('/api/exports/expenses.csv', { params: exportFilters, responseType: 'blob' })
      .then((res) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(res.data);
        a.download = `expenses-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const reset = () => {
    setStatus('ALL');
    setCategory('ALL');
    setFrom('');
    setTo('');
    setQ('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {role === 'EMPLOYEE'
              ? 'Your expense submissions and their approval status.'
              : 'All expenses across your organization.'}
          </p>
        </div>
        <div className="flex gap-2">
          {(role === 'ADMIN' || role === 'MANAGER') ? (
            <Button variant="outline" onClick={onExport}>
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/expenses/new" className='flex items-center'>
              <FilePlus2 className="size-4 mr-2" />
              New expense
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="grid gap-1">
            <Label htmlFor="q" className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Description"
                className="pl-7"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to" className="text-xs text-muted-foreground">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Button variant="ghost" onClick={reset} className="w-full">
              <X className="size-4 mr-1" /> Clear filters
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : isError ? (
          <div className="p-6 text-sm text-destructive">{error?.message || 'Failed to load expenses'}</div>
        ) : !data?.items?.length ? (
          <EmptyState
            title="No expenses match your filters"
            description="Try clearing filters or submit a new expense."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/expenses/${e.id}`} className="block">{formatDate(e.expenseDate)}</Link>
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <div>{e.submitter?.name}</div>
                        <div className="text-xs text-muted-foreground">{e.submitter?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(e.amountCents, e.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[e.status] || 'secondary'}>{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-xs text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
