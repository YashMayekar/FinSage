"use client";
import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { TooltipProps } from "recharts";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

const periodButtons = [
  { key: "7d", label: "1W" },
  { key: "14d", label: "2W" },
  { key: "28d", label: "3W" },
  { key: "30d", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "max", label: "Max" },
];

// ✅ Custom Tooltip
const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length > 0) {
    const { type, value } = payload[1]?.payload || {};
    const formattedValue = `Rs. ${Math.abs(Number(value)).toLocaleString()}`;

    let typeLabel = "";
    if (type === "increase") typeLabel = "Income";
    else if (type === "decrease") typeLabel = "Expense";
    else typeLabel = "Total";

    return (
      <div
        style={{
          borderRadius: "8px",
          backgroundColor: "var(--background)",
          opacity: 0.9,
          color: "var(--foreground)",
          padding: "8px 12px",
        }}
      >
        <div>{label}</div>
        <div>
          {typeLabel}: {formattedValue}
        </div>
      </div>
    );
  }
  return null;
};

interface WaterfallChartProps {
  analysis: {
    series: {
      dataPoints: Array<{
        label: string;
        income: number;
        expense: number;
        savings: number;
      }>;
    };
  };
  isLoading: boolean;
  refresh: () => void;
}

const WaterfallChart = ({ analysis, isLoading, refresh }: WaterfallChartProps) => {
  const [period, setPeriod] = useState<"7d" | "14d" | "28d" | "30d" | "3m" | "6m" | "1y" | "max">("max");

  // ✅ Build waterfall data from analysis hook
  const waterfallData = useMemo(() => {
    if (!analysis?.series?.dataPoints || analysis.series.dataPoints.length === 0) {
      return [];
    }

    let running = 0;
    const result: any[] = [];

    analysis.series.dataPoints.forEach((dataPoint) => {
      const { label, income, expense } = dataPoint;

      if (income > 0) {
        result.push({
          name: label,
          base: running,
          value: income,
          type: "increase",
          label,
        });
        running += income;
      }
      
      if (expense > 0) {
        result.push({
          name: label,
          base: running,
          value: -expense,
          type: "decrease",
          label,
        });
        running -= expense;
      }
    });

    // Add final balance if needed
    // result.push({
    //   name: "Final Balance",
    //   base: 0,
    //   value: running,
    //   type: "total",
    //   label: "Final Balance",
    // });

    return result;
  }, [analysis]);

  // ✅ Filter data based on selected period
  const filteredData = useMemo(() => {
    if (period === "max") return waterfallData;
    
    // Since the data is already in chronological order, we can slice based on period
    const periodIndexMap: Record<string, number> = {
      "7d": 1,
      "14d": 2,
      "28d": 3,
      "30d": 3,
      "3m": 6,
      "6m": 12,
      "1y": 24,
    };

    const itemsToShow = periodIndexMap[period] || waterfallData.length;
    return waterfallData.slice(-itemsToShow);
  }, [waterfallData, period]);

  if (isLoading) {
    return (
      <section className="rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="mb-2">
            <h2 className="font-semibold">Monthly Pattern</h2>
            <p className="text-sm opacity-70">When do you usually spend/earn?</p>
          </div>
          <div className="flex justify-end mb-4 gap-2 mt-2">
            {periodButtons.map((btn) => (
              <button
                key={btn.key}
                disabled
                className="text-[var(--foreground)] p-2 px-4 border border-[var(--border)] rounded-md opacity-50"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[260px] flex items-center justify-center">
          <p>Loading data...</p>
        </div>
      </section>
    );
  }

  if (!analysis?.series?.dataPoints || analysis.series.dataPoints.length === 0) {
    return (
      <section className="rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="mb-2">
            <h2 className="font-semibold">Monthly Pattern</h2>
            <p className="text-sm opacity-70">When do you usually spend/earn?</p>
          </div>
        </div>
        <div className="h-[260px] flex items-center justify-center">
          <p>No data available</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="mb-2">
          <h2 className="font-semibold">Monthly Pattern</h2>
          <p className="text-sm opacity-70">When do you usually spend/earn?</p>
        </div>
        <div className="flex justify-end mb-4 gap-2 mt-2">
          {periodButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setPeriod(btn.key as any)}
              className={`text-[var(--foreground)] p-2 px-4 border border-[var(--border)] rounded-md transition-all duration-200 ${
                period === btn.key ? "bg-gray-700 text-white" : ""
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />

            {/* Transparent base bar pushes the visible bar up */}
            <Bar dataKey="base" stackId="a" fill="transparent" />

            {/* Actual visible bar */}
            <Bar dataKey="value" stackId="a">
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.type === "increase"
                      ? "#22C55E"
                      : entry.type === "decrease"
                      ? "#EF4444"
                      : "#9CA3AF"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default WaterfallChart;