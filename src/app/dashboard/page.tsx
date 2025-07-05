'use client'
import TransactionTable from "@/components/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionAreaChart from "@/components/analytics/AreaChart";
import React, { useState } from "react";
export  default function DashBoard() {
    const { transactions, isLoading, error, mutate } = useTransactions();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
        await mutate();
        } catch (e) {
        console.error("Failed to refresh transactions:", e);
        } finally {
        setIsRefreshing(false);
        }
    };

    return (
        <div className="rounded-lg shadow p-3 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">DashBoard</h1>
                <button onClick={handleRefresh} className=" text-[var(--foreground)] p-2 pr-5 pl-5 border border-[var(--border)] rounded-md hover:border-[rgb(70,70,70)] transition-all duration-200 ease-out">
                {isRefreshing ? 'Refreshing...' : 'Refresh Transactions'}
                </button>
                

            </div>
            <TransactionAreaChart/>
        </div>
    );
}