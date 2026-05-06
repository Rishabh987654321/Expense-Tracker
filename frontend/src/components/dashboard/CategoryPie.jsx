import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export default function CategoryPie({ data, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend by category</CardTitle>
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
              <PieChart>
                <Pie
                  dataKey="totalCents"
                  data={data.items}
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  nameKey="category"
                >
                  {data.items.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  contentStyle={{
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
