import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface AttendanceChartProps {
  attended: number;
  missed: number;
  cancelled: number;
}

export function AttendanceChart({ attended, missed, cancelled }: AttendanceChartProps) {
  const total = attended + missed + cancelled;
  const attendanceRate = total > 0 ? ((attended / total) * 100).toFixed(1) : "0";

  const data = [
    { name: "Посещено", value: attended, color: "#22c55e" },
    { name: "Пропущено", value: missed, color: "#ef4444" },
    { name: "Отменено", value: cancelled, color: "#94a3b8" },
  ].filter((item) => item.value > 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">Нет данных о посещаемости</p>
      </div>
    );
  }

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-primary">{attendanceRate}%</div>
        <div className="text-xs text-muted-foreground">посещаемость</div>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

