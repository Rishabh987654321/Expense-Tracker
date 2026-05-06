import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

export default function KpiCards({ summary, isLoading }) {
  const items = [
    {
      label: 'Approved spend',
      value: summary ? formatMoney(summary.totalApprovedCents) : null,
      hint: 'In selected range',
    },
    { label: 'Pending', value: summary?.counts?.pending ?? null, hint: 'Awaiting review' },
    { label: 'Approved', value: summary?.counts?.approved ?? null, hint: 'In range' },
    { label: 'Rejected', value: summary?.counts?.rejected ?? null, hint: 'In range' },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{it.label}</div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="mt-1 text-2xl font-semibold">{it.value ?? '—'}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">{it.hint}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
