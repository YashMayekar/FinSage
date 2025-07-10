'use client'
import { useTransactions } from "@/hooks/useTransactions";
import TransactionAreaChart from "@/components/analytics/AreaChart";
import React, { useState } from "react";
import RefreshTransactionsButton from "@/components/RefreshTransactionButton";
export  default function DashBoard() {
    return (
        <div className="rounded-lg shadow p-3 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">DashBoard</h1>
                <RefreshTransactionsButton  />
            </div>
            <TransactionAreaChart/>
        </div>
    );
}

        