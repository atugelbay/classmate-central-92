import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SubscriptionProgressProps {
  lessonsUsed: number;
  totalLessons: number;
  subscriptionName?: string;
  size?: "sm" | "md" | "lg";
}

export function SubscriptionProgress({
  lessonsUsed,
  totalLessons,
  subscriptionName,
  size = "md",
}: SubscriptionProgressProps) {
  const lessonsRemaining = Math.max(0, totalLessons - lessonsUsed);
  const percentage = totalLessons > 0 ? ((lessonsRemaining / totalLessons) * 100).toFixed(0) : "0";

  const sizeConfig = {
    sm: { height: 100, innerRadius: 32, outerRadius: 45, fontSize: "text-base" },
    md: { height: 120, innerRadius: 40, outerRadius: 55, fontSize: "text-2xl" },
    lg: { height: 160, innerRadius: 55, outerRadius: 75, fontSize: "text-3xl" },
  };

  const config = sizeConfig[size];

  const data = [
    { name: "Использовано", value: lessonsUsed, color: "#94a3b8" },
    { name: "Осталось", value: lessonsRemaining, color: "#8b5cf6" },
  ];

  // If no lessons remaining, show as depleted
  const displayColor = lessonsRemaining === 0 ? "#ef4444" : "#8b5cf6";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ height: config.height }}>
        <ResponsiveContainer width={config.height} height={config.height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
          <div className={`${config.fontSize} font-bold leading-none`} style={{ color: displayColor }}>
            {lessonsRemaining}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">осталось</div>
        </div>
      </div>
      {subscriptionName && (
        <div className="text-sm font-medium mt-2 text-center">{subscriptionName}</div>
      )}
      <div className="text-xs text-muted-foreground">
        {lessonsUsed} из {totalLessons} использовано ({percentage}%)
      </div>
    </div>
  );
}

