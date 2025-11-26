"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useTransactions from "@/hooks/useTransactions";
import { parse } from "date-fns";

interface Transaction {
  id?: string;
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: any;
}

const MonthlySummaryChart = () => {
  const { transactions } = useTransactions();

  const monthlyData = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((tx: Transaction) => {
  const parsedDate = parse(tx.date, "dd-MM-yyyy", new Date());

  // Format month as "Jan 2025"
  const month = parsedDate.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  if (!grouped[month]) {
    grouped[month] = { income: 0, expense: 0 };
  }

  if (tx.type === "income") {
  grouped[month].income = parseFloat(
    (grouped[month].income + tx.amount).toFixed(2)
  );
} else {
  grouped[month].expense = parseFloat(
    (grouped[month].expense + tx.amount).toFixed(2)
  );
}
});

    return Object.entries(grouped).map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
    }));
  }, [transactions]);

  return (
    <div className="rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Monthly Income vs Expense</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
            contentStyle={{
                borderRadius: "8px",
                backgroundColor: "#2c1616ff",
                color: "#FFFFFF",
              }}
              cursor={{ fill: "rgba(255,255,255,0.1)" }}
            
            />
            <Bar dataKey="income" fill="#22C55E" name="Income" />
            <Bar dataKey="expense" fill="#EF4444" name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlySummaryChart;
