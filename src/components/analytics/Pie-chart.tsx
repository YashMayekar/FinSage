"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { STORAGE_KEY } from "../TransactionClassifier";
import { useTransactions } from "@/hooks/useTransactions";
import { PieChart, Pie, Cell, Label } from "recharts";
import { useMemo } from "react";
import { getRecommendedDataSource } from "@/lib/dataSourceChecker"

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

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c",
  "#d0ed57", "#8dd1e1", "#83a6ed", "#ffbb28", "#ff6384",
];

interface Transaction {
  id: string | number;
  userId: string;
  description: string | null;
  amount: number;
  type: string;
}


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
      <tspan x={cx} y={cy + 24} className="fill-muted-foreground text-sm">
        Total
      </tspan>
    </text>
  );
};


export const TopTransactionsChart = () => {
  const dataSource = getRecommendedDataSource(12); // 12 hour freshness window
  // Local storage transactions
  const [localTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEY, []);
  
  // API transactions with memoization
  const { transactions: apiTransactions, isLoading, error } = useTransactions();
  const memoizedApiTransactions = useMemo(() => apiTransactions, [JSON.stringify(apiTransactions)]);
  
  // Determine which transactions to use
  const transactions = dataSource === "local" ? localTransactions : memoizedApiTransactions;

  // Filter top 10 valid transactions per type
  const chartsData = useMemo(() => {
    if (!transactions || transactions.length === 0 || !transactions[0]?.type) {
      return [];
    }

    const filtered = transactions.filter(
      (tx: any) => tx.description && tx.description !== "NA" && tx.type
    );

    const byType: Record<string, Transaction[]> = {};

    filtered.forEach((tx: any) => {
      if (!byType[tx.type]) byType[tx.type] = [];
      byType[tx.type].push(tx);
    });

    const sortedCharts = Object.entries(byType).map(([type, txs]) => {
      const topTxs = txs
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 10)
        .map(tx => ({
          name: tx.description ?? "Unknown",
          value: Math.abs(tx.amount),
        }));

      const total = topTxs.reduce((sum, t) => sum + t.value, 0);

      return { type, data: topTxs, total };
    });

    return sortedCharts;
  }, [transactions]);

  if (isLoading && dataSource === "api") {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  if (error && dataSource === "api") {
    return <div className="p-4 text-center text-red-500">Error loading data</div>;
  }

  if (chartsData.length === 0) {
    return (
      <div className="p-4 text-center">
        No transaction data available from {dataSource === "local" ? "local storage" : "API"}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full">
      <div className="grid gap-20 grid-cols-2 w-[70%]">
        {chartsData.map(({ type, data, total }, index) => (
          <Card
            key={`${type}-${index}`}
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
                  }, {} as Record<string, { label: string }>),
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
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
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