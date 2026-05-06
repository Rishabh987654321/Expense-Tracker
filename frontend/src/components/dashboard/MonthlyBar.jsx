import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

export default function MonthlyBar({ data, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly approved spend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data?.items?.length ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No approved spend in this range.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.items} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  stroke="var(--border)"
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
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
                <Bar dataKey="totalCents" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
