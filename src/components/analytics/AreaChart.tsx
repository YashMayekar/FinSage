"use client";

import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { parse } from "date-fns";
import useTransactions from "@/hooks/useTransactions";

interface Transaction {
  date: string; // "DD-MM-YYYY"
  description: string | null;
  type: string; // "income" | "expense"
  amount: number;
  additionalData: string | null;
}

interface TransactionData {
  type: string;
  data: {
    date: string;
    amount: number;
  }[];
}

const DEFAULT_COLORS = ["#6366F1", "#EF4444", "#22C55E", "#F59E0B", "#3B82F6"];

const getColorForType = (type: string, index: number) => {
  const typeColorMap: Record<string, string> = {
    income: "#22C55E", // green
    expense: "#EF4444", // red
  };
  return typeColorMap[type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

const transformTransactionsToChartData = (transactions: Transaction[]): TransactionData[] => {
  const groupedByType: Record<string, { date: string; amount: number }[]> = {};

  transactions.forEach((tx) => {
    const parsedDate = parse(tx.date, "dd-MM-yyyy", new Date());
    const isoDate = parsedDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    if (!groupedByType[tx.type]) {
      groupedByType[tx.type] = [];
    }

    const existing = groupedByType[tx.type].find((entry) => entry.date === isoDate);
    if (existing) {
      existing.amount += tx.amount;
    } else {
      groupedByType[tx.type].push({ date: isoDate, amount: tx.amount });
    }
  });

  return Object.entries(groupedByType).map(([type, data]) => ({
    type,
    data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  }));
};

const TransactionChart = () => {
  const { transactions, isLoading, error } = useTransactions();
  const [timeRange, setTimeRange] = useState("90d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const generatedData = useMemo(() => transformTransactionsToChartData(transactions), [transactions]);

  const { filteredData, typeTotals } = useMemo(() => {
    if (!generatedData || generatedData.length === 0) return { filteredData: [], typeTotals: {} };

    const allDates = Array.from(
      new Set(generatedData.flatMap((typeData) => typeData.data.map((item) => item.date)))
    );

    let startDate: Date;
    let endDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));

    if (timeRange === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      startDate = new Date(endDate);
      const days = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90;
      startDate.setDate(endDate.getDate() - days);
    }

    const totals: Record<string, number> = {};
    generatedData.forEach((typeData) => {
      totals[typeData.type] = typeData.data
        .filter((item) => new Date(item.date) >= startDate && new Date(item.date) <= endDate)
        .reduce((sum, item) => sum + item.amount, 0);
    });

    const chartData = allDates
      .filter((date) => new Date(date) >= startDate && new Date(date) <= endDate)
      .map((date) => {
        const entry: any = { date };
        generatedData.forEach((typeData) => {
          const transaction = typeData.data.find((item) => item.date === date);
          entry[typeData.type] = transaction ? transaction.amount : 0;
        });
        return entry;
      });

    return { filteredData: chartData, typeTotals: totals };
  }, [generatedData, timeRange, customStart, customEnd]);

  if (isLoading) return <div className="p-6 bg-black  rounded-xl">Loading chart...</div>;
  if (error && transactions.length === 0)
    return <div className="p-6 bg-black text-red-500 rounded-xl">Failed to load data.</div>;

  return (
    <div className="  rounded-xl shadow p-6 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Transaction Overview</h2>
          <p className=" text-sm">Grouped by type and filtered by date</p>
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
                className="border bg-black  rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border bg-black  rounded-lg px-3 py-2"
              />
            </>
          )}
        </div>
      </div>

      {/* Type totals */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(typeTotals).map(([type, total], index) => (
          <div
            key={type}
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: `${getColorForType(type, index)}20`,
              borderLeft: `4px solid ${getColorForType(type, index)}`,
            }}
          >
            <div className="text-sm font-medium" style={{ color: getColorForType(type, index) }}>
              {type}
            </div>
            <div className=" font-bold">
              ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              {generatedData.map((typeData, index) => (
                <linearGradient
                  key={`fill-${typeData.type}`}
                  id={`fill-${typeData.type}`}
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={getColorForType(typeData.type, index)}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={getColorForType(typeData.type, index)}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2" />
            <XAxis
              dataKey="date"
              tickMargin={10}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                backgroundColor: "#1F2937",
                color: "#FFFFFF",
              }}
              labelFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            {generatedData.map((typeData, index) => (
              <Area
                key={typeData.type}
                type="natural"
                dataKey={typeData.type}
                stroke={getColorForType(typeData.type, index)}
                fill={`url(#fill-${typeData.type})`}
                stackId="1"
                name={typeData.type}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TransactionChart;
