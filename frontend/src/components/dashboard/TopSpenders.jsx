import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

export default function TopSpenders({ data, isLoading }) {
  const items = (data?.items || []).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top spenders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !items.length ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No approved spend yet.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  stroke="var(--border)"
                  width={120}
                />
                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                  contentStyle={{
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                <Bar dataKey="totalCents" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
