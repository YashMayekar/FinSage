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
import useTransactions from "@/hooks/useTransactions";
import { parse } from "date-fns";

import { TooltipProps } from "recharts";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

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
          color: "var(--foreground)", // ✅ use var-foreground
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

interface Transaction {
  id?: string;
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: any;
}

const WaterfallChart = () => {
  const { transactions } = useTransactions();
  const [period, setPeriod] = useState<"3m" | "6m" | "1y" | "max">("max");

  // ✅ Build raw waterfall data

const rawData = useMemo(() => {
  const grouped: Record<string, { income: number; expense: number; date: Date }> = {};

  transactions.forEach((tx: Transaction) => {
    // ✅ Parse to Date object
    const parsedDate = parse(tx.date, "dd-MM-yyyy", new Date());

    const month = parsedDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });

    if (!grouped[month]) {
      grouped[month] = { income: 0, expense: 0, date: parsedDate };
    }

    if (tx.type === "income") {
      grouped[month].income += tx.amount;
    } else {
      grouped[month].expense += tx.amount;
    }
  });

  let running = 0;
  const result: any[] = [];

  Object.entries(grouped)
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime()) // ✅ sort chronologically
    .forEach(([month, { income, expense, date }]) => {
      if (income > 0) {
        result.push({
          name: month,
          base: running,
          value: income,
          type: "increase",
          date, // ✅ store Date
        });
        running += income;
      }
      if (expense > 0) {
        result.push({
          name: month,
          base: running,
          value: -expense,
          type: "decrease",
          date, // ✅ store Date
        });
        running -= expense;
      }
    });

//   result.push({
//     name: "Final Balance",
//     base: 0,
//     value: running,
//     type: "total",
//     date: new Date(), // ✅ give it a date so filters don’t break
//   });

  return result;
}, [transactions]);

// ✅ Filtering works now
// ✅ Filtering and rebuilding base values
const waterfallData = useMemo(() => {
  if (!rawData.length) return [];

  if (period === "max") return rawData;

  // ✅ Get the latest available date in the data
  const latestDate = rawData[rawData.length - 1].date;

  let cutoff: Date;
  if (period === "3m") {
    cutoff = new Date(latestDate);
    cutoff.setMonth(cutoff.getMonth() - 3); // last 3 months inclusive
  } else if (period === "6m") {
    cutoff = new Date(latestDate);
    cutoff.setMonth(cutoff.getMonth() - 6);
  } else {
    cutoff = new Date(latestDate);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }

  // ✅ Take only data within cutoff → latestDate
  const filtered = rawData.filter(
    (d) => d.date >= cutoff && d.date <= latestDate
  );

  // ✅ Rebuild running + base so it starts from 0
  let running = 0;
  const rebuilt = filtered.map((d) => {
    const newEntry = {
      ...d,
      base: running,
    };
    running += d.value;
    return newEntry;
  });

  return rebuilt;
}, [period, rawData]);


  return (
    <div className="rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Income and Expenses Flow</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("3m")}
            className={`text-[var(--foreground)] p-2 px-5 
                border border-[var(--border)] rounded-md 
                hover: border-[rgb(70,70,70)] hover:cursor-pointer transition-all duration-200 ease-out ${
              period === "3m" ? "bg-gray-700 text-white" : ""
            }`}
          >
            3M
          </button>
          <button
            onClick={() => setPeriod("6m")}
            className={`text-[var(--foreground)] p-2 px-5 
                border border-[var(--border)] rounded-md 
                hover: border-[rgb(70,70,70)] hover:cursor-pointer transition-all duration-200 ease-out ${
              period === "6m" ? "bg-gray-700 text-white" : ""
            }`}
          >
            6M
          </button>
          <button
            onClick={() => setPeriod("1y")}
            className={`text-[var(--foreground)] p-2 px-5 
                border border-[var(--border)] rounded-md 
                hover: border-[rgb(70,70,70)] hover:cursor-pointer transition-all duration-200 ease-out ${
              period === "1y" ? "bg-gray-700 text-white" : ""
            }`}
          >
            1Y
          </button>
          <button
            onClick={() => setPeriod("max")}
            className={`text-[var(--foreground)] p-2 px-5 
                border border-[var(--border)] rounded-md 
                hover: border-[rgb(70,70,70)] hover:cursor-pointer transition-all duration-200 ease-out ${
              period === "max" ? "bg-gray-700 text-white" : ""
            }`}
          >
            Max
          </button>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }}/>

            {/* Transparent base bar pushes the visible bar up */}
            <Bar dataKey="base" stackId="a" fill="transparent" />

            {/* Actual visible bar */}
            <Bar dataKey="value" stackId="a">
              {waterfallData.map((entry, index) => (
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
    </div>
  );
};

export default WaterfallChart;
