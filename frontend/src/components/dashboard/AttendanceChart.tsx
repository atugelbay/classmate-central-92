import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Loader2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>Посещаемость</CardTitle>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            {(["week", "month"] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 px-3"
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : safeAttendanceData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Нет данных за выбранный период
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalAttended}</div>
                <div className="text-xs text-muted-foreground">Присутствовали</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalMissed}</div>
                <div className="text-xs text-muted-foreground">Отсутствовали</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{attendanceRate}%</div>
                <div className="text-xs text-muted-foreground">Процент посещаемости</div>
              </div>
            </div>

            {/* Pie Chart */}
            {(totalAttended > 0 || totalMissed > 0) && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={safeAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="attended"
                  name="Присутствовали"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="missed"
                  name="Отсутствовали"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

