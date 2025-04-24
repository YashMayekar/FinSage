"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions"; // Replace with your actual hook path
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Colors to cycle through
const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c",
  "#d0ed57", "#8dd1e1", "#83a6ed", "#ffbb28", "#ff6384",
];

type Transaction = {
  id: number;
  userId: string;
  description: string | null;
  amount: number;
  type: string;
};

const CenteredLabel = ({
  viewBox,
  total,
}: {
  viewBox?: { cx: number; cy: number };
  total: number;
}) => {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} y={cy} className="fill-foreground text-2xl font-bold">
        ₹{total.toLocaleString()}
      </tspan>
      <tspan
        x={cx}
        y={cy + 24}
        className="fill-muted-foreground text-sm"
      >
        Total
      </tspan>
    </text>
  );
};

export const TopTransactionsChart = () => {
  const {transactions } = useTransactions();

  // Filter top 10 valid transactions per type
  const chartsData = useMemo(() => {
    const filtered = transactions.filter(
      (tx: Transaction) => tx.description && tx.description !== "NA"
    );

    const byType: Record<string, Transaction[]> = {};

    filtered.forEach((tx: any) => {
      if (!byType[tx.type]) byType[tx.type] = [];
      byType[tx.type].push(tx);
    });

    const sortedCharts = Object.entries(byType).map(([type, txs]) => {
      const topTxs = txs
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((tx) => ({
          name: tx.description ?? "Unknown",
          value: tx.amount,
        }));

      const total = topTxs.reduce((sum, t) => sum + t.value, 0);

      return { type, data: topTxs, total };
    });

    return sortedCharts;
  }, [transactions]);

  return (
    <div className="flex justify-center items-center w-full">
    <div className="grid gap-20 grid-cols-2 w-[70%]">
      {chartsData.map(({ type, data, total }, index) => (
        <Card
          key={type}
          className="h-full w-full bg-black border border-muted rounded-lg"
        >
          <CardHeader className="text-center">
            <CardTitle>Top Transactions - {type}</CardTitle>
            <CardDescription>Top 10 by Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="mx-auto aspect-square max-h-[250px]"
              config={{
                value: { label: "Amount" },
                ...data.reduce((acc, entry) => {
                  acc[entry.name] = { label: entry.name };
                  return acc;
                }, {} as any),
              }}
            >
              <PieChart className="justify-center">
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={100}
                  strokeWidth={5}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                  <Label
                    content={(props) => (
                      <CenteredLabel
                        viewBox={props.viewBox as { cx: number; cy: number }}
                        total={total}
                      />
                    )}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
  
  );
};

export default TopTransactionsChart;
