import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { PaymentTransaction } from "@/types";
import moment from "moment";

interface BalanceChartProps {
  transactions: PaymentTransaction[];
  currentBalance: number;
}

export function BalanceChart({ transactions, currentBalance }: BalanceChartProps) {
  const { t } = useTranslation("students");
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

  // Take last 12 transactions for cleaner chart
  const chartData = balanceHistory.slice(-12);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-52">
        <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
      </div>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}к`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: "8px 12px",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} ₸`, t("fields.balance")]}
            labelStyle={{ color: '#64748b', marginBottom: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ fill: "#8b5cf6", r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

