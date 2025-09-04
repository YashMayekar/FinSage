'use client'
// import { useTransactions } from "@/hooks/useTransactions";
import TransactionAreaChart from "@/components/analytics/AreaChart";
import React from "react";
import RefreshTransactionsButton from "@/components/RefreshTransactionButton";
// import MonthlySummaryChart from "@/components/analytics/BarChart";
import TopContributorsCharts from "@/components/analytics/PieChart";
import WaterfallChart from "@/components/analytics/WaterFallChart";
export  default function DashBoard() {
    return (
        <div className="rounded-lg shadow p-3 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">DashBoard</h1>
                <RefreshTransactionsButton  />
            </div>
            <TransactionAreaChart/>
            <TopContributorsCharts/>
            {/* <MonthlySummaryChart/> */}
            <WaterfallChart/>
        </div>
    );
}

        