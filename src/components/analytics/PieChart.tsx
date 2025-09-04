"use client";

import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { parse } from "date-fns";
import useTransactions from "@/hooks/useTransactions";

const COLORS = ["#6366F1", "#22C55E", "#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6"];

// ✅ Custom Legend Component
const CustomLegend = ({ data }: { data: { name: string; value: number }[] }) => (
  <div className="flex flex-wrap justify-center mt-3 gap-3">
    {data.map((entry, index) => (
      <div
        key={index}
        className="flex items-center gap-2 text-sm text-[var-foreground]"
      >
        <div
          className="w-3 h-3 rounded"
          style={{ backgroundColor: COLORS[index % COLORS.length] }}
        />
        {entry.name}
      </div>
    ))}
  </div>
);

const TopContributorsCharts = () => {
  const { transactions, isLoading, error } = useTransactions();
  const [timeRange, setTimeRange] = useState("90d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ✅ Filter transactions based on time range
  const filteredTransactions = useMemo(() => {
    if (!transactions.length) return [];

    const allDates = transactions.map((tx) =>
      parse(tx.date, "dd-MM-yyyy", new Date()).getTime()
    );

    let endDate = new Date(Math.max(...allDates));
    let startDate = new Date(endDate);

    if (timeRange === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const days = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90;
      startDate.setDate(endDate.getDate() - days);
    }

    return transactions.filter((tx) => {
      const txDate = parse(tx.date, "dd-MM-yyyy", new Date());
      return txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, timeRange, customStart, customEnd]);

  // ✅ Group transactions and prepare top 5 income & expense
  const { incomeData, expenseData } = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};

    filteredTransactions.forEach((tx) => {
      const key = tx.description || "Unknown";
      if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
      if (tx.type === "income") {
        grouped[key].income += tx.amount;
      } else {
        grouped[key].expense += tx.amount;
      }
    });

    const incomeArr = Object.entries(grouped)
      .map(([desc, { income }]) => ({ name: desc, value: income }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const expenseArr = Object.entries(grouped)
      .map(([desc, { expense }]) => ({ name: desc, value: expense }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { incomeData: incomeArr, expenseData: expenseArr };
  }, [filteredTransactions]);

  if (isLoading) return <div className="p-6">Loading charts...</div>;
  if (error && transactions.length === 0)
    return <div className="p-6 text-red-500">Failed to load data.</div>;

  // ✅ Format heading
  const durationLabel =
    timeRange === "7d"
      ? "Last 7 Days"
      : timeRange === "30d"
      ? "Last 30 Days"
      : timeRange === "90d"
      ? "Last 3 Months"
      : "Custom Range";

  return (
    <div className="rounded-xl shadow p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            Top 5 Transaction Sources in {durationLabel}
          </h2>
          <p className="text-sm text-[var-foreground]">
            Based on description grouping
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="border bg-[var(--background)]  rounded-lg px-3 py-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="custom">Custom</option>
          </select>
          {timeRange === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Income Pie Chart */}
        <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var-background]">
          <h3 className="text-md font-medium mb-3 text-[var-foreground]">
            Top Income Sources
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={incomeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {incomeData.map((_, index) => (
                  <Cell
                    key={`income-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) =>
                  `₹${val.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={incomeData} />
        </div>

        {/* Expense Pie Chart */}
        <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var-background]">
          <h3 className="text-md font-medium mb-3 text-[var-foreground]">
            Top Expense Categories
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={expenseData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {expenseData.map((_, index) => (
                  <Cell
                    key={`expense-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) =>
                  `₹${val.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend data={expenseData} />
        </div>
      </div>
    </div>
  );
};

export default TopContributorsCharts;
