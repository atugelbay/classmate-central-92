import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PaymentTransaction } from "@/types";
import moment from "moment";

interface BalanceChartProps {
  transactions: PaymentTransaction[];
  currentBalance: number;
}

export function BalanceChart({ transactions, currentBalance }: BalanceChartProps) {
  // Calculate balance history from transactions
  const balanceHistory = transactions
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc, transaction) => {
      const lastBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const amount = transaction.type === "payment" ? transaction.amount : -transaction.amount;
      acc.push({
        date: moment(transaction.createdAt).format("DD.MM"),
        balance: lastBalance + amount,
        fullDate: transaction.createdAt,
      });
      return acc;
    }, [] as Array<{ date: string; balance: number; fullDate: string }>);

  // Take last 10 transactions for cleaner chart
  const chartData = balanceHistory.slice(-10);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">Нет истории транзакций</p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#94a3b8"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#94a3b8"
            tickFormatter={(value) => `${value.toLocaleString()}₸`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} ₸`, "Баланс"]}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: "#8b5cf6", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

