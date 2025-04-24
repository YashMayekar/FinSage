// Data-Generator.tsx
'use client'
import { useTransactions } from "@/hooks/useTransactions"

export function useGeneratedData() {
  const { transactions } = useTransactions();
  const types = Array.from(new Set(transactions.map((tx: any) => tx.type))) as string[];
  
  const generatedData = types.map((type) => {
    return {
      type,
      data: transactions
        .filter((tx: any) => tx.type === type)
        .map((tx: any) => ({ date: tx.date, amount: tx.amount })),
    };
  });

  return generatedData;
}