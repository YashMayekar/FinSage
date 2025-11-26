'use client';
import { useTransactions } from "@/hooks/useTransactions";
import React, { useState } from "react";

interface RefreshTransactionsButtonProps {
  className?: string;
}

export default function RefreshTransactionsButton({ className = "" }: RefreshTransactionsButtonProps) {
  const { mutate } = useTransactions();
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
    <div className={`p-3 gap-4 ${className}`}>
      <button
        onClick={handleRefresh}
        className="text-[var(--foreground)] p-2 px-5 border border-[var(--border)] rounded-md hover:border-[rgb(70,70,70)] transition-all duration-200 ease-out"
      >
        {isRefreshing ? "Refreshing..." : "Refresh Transactions"}
      </button>
    </div>
  );
}
