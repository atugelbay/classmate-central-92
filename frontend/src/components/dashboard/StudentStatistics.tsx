import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Loader2, ArrowRight, UserCheck, UserX, Snowflake } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function StudentStatistics() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const students = stats?.students || { active: 0, new: 0, frozen: 0 };
  
  const pieData = [
    { name: "Активные", value: students.active, color: "#22c55e" },
    { name: "Новые", value: students.new, color: "#3b82f6" },
    { name: "Замороженные", value: students.frozen, color: "#64748b" },
  ].filter(item => item.value > 0);

  const total = students.active + students.frozen;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Статистика учеников</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/students")}
          className="gap-1"
        >
          Все ученики
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
              <UserCheck className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {students.active}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Активные</div>
            </div>

            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
              <UserPlus className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {students.new}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Новые</div>
            </div>

            <div className="rounded-lg border bg-slate-50 dark:bg-slate-950/20 p-3 text-center">
              <Snowflake className="h-5 w-5 mx-auto mb-2 text-slate-600" />
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                {students.frozen}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Заморожены</div>
            </div>
          </div>

          {/* Pie Chart */}
          {total > 0 && pieData.length > 0 && (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value, entry: any) => `${value}: ${entry.payload.value}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Total Count */}
          <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Всего учеников
                </div>
                <div className="text-3xl font-bold text-primary">
                  {total}
                </div>
              </div>
              <Users className="h-12 w-12 text-primary/20" />
            </div>
          </div>

          {/* New Students Notice */}
          {students.new > 0 && (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
              <div className="flex items-start gap-2">
                <UserPlus className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {students.new} новых {students.new === 1 ? 'ученик' : 'учеников'}
                  </span>
                  <span className="text-muted-foreground"> за последние 30 дней</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

