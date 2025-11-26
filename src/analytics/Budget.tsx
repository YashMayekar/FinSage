"use client";

import { useState } from "react";
import { useTransactionAnalysis } from "@/hooks/useTransactionAnalysis";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { min } from "date-fns";

const COLORS = ["#2563eb", "#16a34a", "#f97316"];

export default function BudgetPage() {
  const { analysis, isLoading } = useTransactionAnalysis({ mode: '30d', start: '', end: '' });

  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [savedAmount, setSavedAmount] = useState<number>(0);

  if (isLoading) return <p className="p-6">Loading budget insights...</p>;

  const monthlyIncome = analysis?.summary?.avgMonthlyIncome || 0;
  const monthlyExpense = analysis?.summary?.avgMonthlyExpense || 0;
  const suggestedSavings = monthlyIncome * 0.2; // 20% default rule

  const pieData = [
    { name: "Needs (50%)", value: monthlyIncome * 0.5 },
    { name: "Wants (30%)", value: monthlyIncome * 0.3 },
    { name: "Savings (20%)", value: monthlyIncome * 0.2 },
  ];

  const goalProgress =
    goalAmount > 0 ? Math.min((savedAmount / goalAmount) * 100, 100) : 0;

  return (
    <div className="grid gap-6 p-6 md:grid-cols-2">
      {/* Suggested Budget */}
      <div className="rounded-2xl border shadow p-4 bg-[var-(--background)]">
        <h2 className="text-lg font-semibold mb-2">Suggested Budget Plan</h2>
        <p className="text-sm text-[var-(--foreground)] mb-4">
          Based on your average monthly income (${monthlyIncome.toFixed(2)}), 
          here’s a suggested 50/30/20 breakdown:
        </p>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" label outerRadius={90}>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm space-y-1">
          <p>Needs: ${(monthlyIncome * 0.5).toFixed(2)}</p>
          <p>Wants: ${(monthlyIncome * 0.3).toFixed(2)}</p>
          <p>Savings: ${(monthlyIncome * 0.2).toFixed(2)} (suggested)</p>
        </div>
      </div>

      {/* Goal Setter */}
      <div className="rounded-2xl border shadow p-4 bg-[var-(--background)] text-[var-(--foreground)]">
        <h2 className="text-lg font-semibold mb-4">Set Financial Goals</h2>

        <div className="mb-3">
          <label className="block text-sm font-medium">Goal Name</label>
          <input
            type="text"
            className="w-full mt-1 border rounded p-2 text-sm"
            placeholder="e.g., Emergency Fund"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium">Goal Amount ($)</label>
          <input
            type="number"
            className="w-full mt-1 border rounded p-2 text-sm"
            value={goalAmount}
            min="1"
            onChange={(e) => setGoalAmount(Number(e.target.value))
            }
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium">Amount Saved So Far ($)</label>
          <input
            type="number"
            className="w-full mt-1 border rounded p-2 text-sm"
            value={savedAmount}
            onChange={(e) => setSavedAmount(Number(e.target.value))}
          />
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
          <div
            className="bg-green-500 h-3 rounded-full"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <p className="text-sm mt-2 text-gray-600">
          {goalProgress >= 100
            ? "🎉 Goal achieved!"
            : `Progress: ${goalProgress.toFixed(1)}%`}
        </p>

        <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm">
          Save Goal
        </button>
      </div>
    </div>
  );
}
