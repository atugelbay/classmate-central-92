import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRevenueChart } from "@/hooks/useData";

type ChartType = "line" | "bar";
type Period = "week" | "month" | "year";

export function RevenueChart() {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [period, setPeriod] = useState<Period>("week");
  
  const { data: revenueData = [], isLoading } = useRevenueChart(period);
  
  // Ensure revenueData is an array
  const safeRevenueData = Array.isArray(revenueData) ? revenueData : [];

  const periodLabels = {
    week: "Неделя",
    month: "Месяц",
    year: "Год",
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>График доходов</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 rounded-lg border p-1">
              {(["week", "month", "year"] as Period[]).map((p) => (
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
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className="h-7 px-3"
              >
                Линия
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="h-7 px-3"
              >
                Столбцы
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : safeRevenueData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Нет данных за выбранный период
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "line" ? (
              <LineChart data={safeRevenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-sm"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <YAxis
                  className="text-sm"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} ₸`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Доход"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={safeRevenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-sm"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <YAxis
                  className="text-sm"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} ₸`}
                />
                <Legend />
                <Bar
                  dataKey="amount"
                  name="Доход"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

