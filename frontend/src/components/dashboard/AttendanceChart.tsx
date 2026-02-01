import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAttendanceChart } from "@/hooks/useData";

type Period = "week" | "month";

export function AttendanceChart() {
  const [period, setPeriod] = useState<Period>("week");
  
  const { data: attendanceData = [], isLoading } = useAttendanceChart(period);

  const periodLabels = {
    week: "Неделя",
    month: "Месяц",
  };

  // Calculate totals for pie chart - ensure attendanceData is an array
  const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
  const totalAttended = safeAttendanceData.reduce((sum, item) => sum + item.attended, 0);
  const totalMissed = safeAttendanceData.reduce((sum, item) => sum + item.missed, 0);
  
  const pieData = [
    { name: "Присутствовали", value: totalAttended, color: "#22c55e" },
    { name: "Отсутствовали", value: totalMissed, color: "#ef4444" },
  ];

  const attendanceRate = totalAttended + totalMissed > 0 
    ? (totalAttended / (totalAttended + totalMissed) * 100).toFixed(1)
    : "0";

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Посещаемость</CardTitle>
          </div>
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
            {(["week", "month"] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className={`h-7 px-3 rounded-lg ${period === p ? "" : "hover:bg-transparent hover:text-primary"}`}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : safeAttendanceData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Нет данных за выбранный период
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center rounded-xl p-3 bg-gradient-to-br from-[hsl(158,40%,96%)] to-[hsl(158,30%,94%)] shadow-sm">
                <div className="text-xl font-bold text-success">{totalAttended}</div>
                <div className="text-xs text-muted-foreground mt-1">Присутствовали</div>
              </div>
              <div className="text-center rounded-xl p-3 bg-gradient-to-br from-[hsl(0,40%,97%)] to-[hsl(0,30%,95%)] shadow-sm">
                <div className="text-xl font-bold text-destructive">{totalMissed}</div>
                <div className="text-xs text-muted-foreground mt-1">Отсутствовали</div>
              </div>
              <div className="text-center rounded-xl p-3 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
                <div className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">{attendanceRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">Посещаемость</div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px",
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} 
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="attended"
                  name="Присутствовали"
                  stroke="hsl(var(--dashboard-stat-positive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--dashboard-stat-positive))", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="missed"
                  name="Отсутствовали"
                  stroke="hsl(var(--dashboard-stat-negative))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--dashboard-stat-negative))", r: 3 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

