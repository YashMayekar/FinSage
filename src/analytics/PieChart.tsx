"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { parse } from "date-fns";
import useTransactions from "@/hooks/useTransactions";
import useTransactionAnalysis from "@/hooks/useTransactionAnalysis";

const PieColors = [
  "#6366F1", // Indigo
  "#22C55E", // Green
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
];

const TopContributorsCharts = () => {
  const { transactions, isLoading, error } = useTransactions();
  const { analysis } = useTransactionAnalysis();
  // ✅ Filter transactions
  return (
    <section className="rounded-xl border p-4">
      <div className="">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">
              Top 5 Transaction Sources in {}
            </h2>
            <span className="text-xs text-[var-foreground]">
              Based on description grouping
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 h-[95vh] gap-6 w-full">
          {/* Income Pie */}
          <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var(--background)]">
            <h3 className="text-md font-medium mb-3 text-[var-foreground]">
              Top Income Sources
            </h3>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={analysis?.topSources?.income || []}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analysis?.topSources?.income.map((_, index) => (
                    <Cell
                      key={`income-${index}`}
                      fill={PieColors[index % PieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    background: "white",
                    color: "black",
                  }}
                  formatter={(val: number) =>
                    `₹${val.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            {/* <CustomLegend data={incomeData} /> */}
          </div>

          {/* Expense Pie */}
          <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var(--background)]">
            <h3 className="text-md font-medium mb-3 text-[var-foreground]">
              Top Expense Categories
            </h3>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={analysis?.topSources?.expense || []}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analysis?.topSources?.expense.map((_, index) => (
                    <Cell
                      key={`expense-${index}`}
                      fill={PieColors[index % PieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  
                  contentStyle={{
                    borderRadius: 8,
                    background: "white",
                    color: "black",
                  }}
                  formatter={(val: number) =>
                    `₹${val.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            {/* <CustomLegend data={expenseData} /> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopContributorsCharts;
