import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/client';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  GraduationCap,
  UserCheck,
  FolderOpen,
  CreditCard,
  Activity,
  UserPlus,
  Server,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => dashboardApi.getActivity(30),
  });

  const { data: systemData } = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: dashboardApi.getSystem,
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Companies"
          value={stats?.totalCompanies || 0}
          icon={Building2}
        />
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
        />
        <StatsCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={GraduationCap}
        />
        <StatsCard
          title="Total Teachers"
          value={stats?.totalTeachers || 0}
          icon={UserCheck}
        />
        <StatsCard
          title="Total Groups"
          value={stats?.totalGroups || 0}
          icon={FolderOpen}
        />
        <StatsCard
          title="Total Transactions"
          value={stats?.totalTransactions || 0}
          icon={CreditCard}
        />
        <StatsCard
          title="Active Users Today"
          value={stats?.activeUsersToday || 0}
          icon={Activity}
        />
        <StatsCard
          title="New Users This Week"
          value={stats?.newUsersThisWeek || 0}
          icon={UserPlus}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>New registrations over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#8884d8"
                    name="Users"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="students"
                    stroke="#82ca9d"
                    name="Students"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#ffc658"
                    name="Transactions"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span>Main API</span>
              </div>
              <Badge variant={stats?.mainApiStatus === 'ok' ? 'success' : 'destructive'}>
                {stats?.mainApiStatus || 'Unknown'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Logs (24h)</span>
              <span className="font-medium">{stats?.logs?.last24h || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Errors (24h)</span>
              <Badge variant={stats?.logs?.errorsLast24h > 0 ? 'destructive' : 'secondary'}>
                {stats?.logs?.errorsLast24h || 0}
              </Badge>
            </div>

            {systemData?.data && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Database</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span>Tables</span>
                    <span>{systemData.data.database?.tablesCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Rows</span>
                    <span>{(systemData.data.database?.totalRows || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Admin Backend</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span>Node Version</span>
                    <span>{systemData.data.nodeVersion}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Uptime</span>
                    <span>{Math.floor(systemData.data.uptime / 3600)}h {Math.floor((systemData.data.uptime % 3600) / 60)}m</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
