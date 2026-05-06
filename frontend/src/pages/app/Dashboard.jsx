import * as React from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KpiCards from '@/components/dashboard/KpiCards';
import CategoryPie from '@/components/dashboard/CategoryPie';
import MonthlyBar from '@/components/dashboard/MonthlyBar';
import TopSpenders from '@/components/dashboard/TopSpenders';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAnalyticsSummary,
  useByCategory,
  useByMonth,
  useByUser,
} from '@/api/analytics';
import { useAuthStore } from '@/stores/authStore';
import { useTeam } from '@/api/team';

export default function Dashboard() {
  const me = useAuthStore((s) => s.user);
  const role = me?.role;
  const isManager = role === 'ADMIN' || role === 'MANAGER';

  if (!isManager) {
    const submitterId = me?.userId;
    const summary = useAnalyticsSummary({ submitterId });
    const byCategory = useByCategory({ submitterId });
    const byMonth = useByMonth({ submitterId });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-heading">Hello again</h1>
            <p className="text-sm text-muted-foreground">Your expenses and trends.</p>
          </div>
          <Button asChild>
            <Link to="/expenses/new" className="inline-flex items-center gap-1.5">
              <FilePlus2 className="size-4" />
              New expense
            </Link>
          </Button>
        </div>

        <KpiCards summary={summary.data} isLoading={summary.isLoading} />

        <div className="grid gap-4 lg:grid-cols-2">
          <MonthlyBar data={byMonth.data} isLoading={byMonth.isLoading} />
          <CategoryPie data={byCategory.data} isLoading={byCategory.isLoading} />
        </div>
      </div>
    );
  }

  const { data: teamData } = useTeam();
  const [selectedUserId, setSelectedUserId] = React.useState('ALL');
  const submitterId = selectedUserId === 'ALL' ? undefined : selectedUserId;

  const summary = useAnalyticsSummary({ submitterId });
  const byCategory = useByCategory({ submitterId });
  const byMonth = useByMonth({ submitterId });
  const byUser = useByUser({ submitterId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {submitterId ? 'Employee spend over the last 12 months.' : 'Approved spend over the last 12 months.'}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All employees</SelectItem>
              {(teamData?.users || []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link to="/approvals" className="inline-flex items-center gap-1.5">
              <ListChecks className="size-4" />
              Review pending
            </Link>
          </Button>
          <Button asChild>
            <Link to="/expenses/new" className="inline-flex items-center gap-1.5">
              <FilePlus2 className="size-4" />
              New expense
            </Link>
          </Button>
        </div>
      </div>

      <KpiCards summary={summary.data} isLoading={summary.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyBar data={byMonth.data} isLoading={byMonth.isLoading} />
        <CategoryPie data={byCategory.data} isLoading={byCategory.isLoading} />
      </div>

      {!submitterId ? <TopSpenders data={byUser.data} isLoading={byUser.isLoading} /> : null}
    </div>
  );
}
