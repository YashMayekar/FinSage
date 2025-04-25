// Data-Generator.tsx
'use client'
import { useTransactions } from "@/hooks/useTransactions"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEY } from "@/components/TransactionClassifier";
import { getRecommendedDataSource } from "@/lib/dataSourceChecker"

type Transaction = {
  id: string | number;
  date: string;
  amount: number;
  type: string;
  description?: string | null;
};

type GeneratedData = {
  type: string;
  data: {
    date: string;
    amount: number;
  }[];
}[];

type DataSource = 'local' | 'api';

interface UseGeneratedDataProps {
  dataSource: DataSource;
}

export function useGeneratedData( { dataSource }: UseGeneratedDataProps  ): GeneratedData {
  // Local storage transactions
  const [localTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEY, []);
  
  // API transactions
  const { transactions: apiTransactions } = useTransactions();
  
  // Determine which transactions to use
  const transactions = dataSource === "local" ? localTransactions : apiTransactions;

  // Get unique transaction types
  const types = Array.from(new Set(transactions.map((tx: any) => tx.type))) as string[];
  
  // Generate the structured data
  const generatedData = types.map((type) => {
    return {
      type,
      data: transactions
        .filter((tx: any) => tx.type === type)
        .map((tx: any) => ({ 
          date: tx.date, 
          amount: Math.abs(tx.amount) // Using absolute values for consistency
        }))
    };
  });

  return generatedData;
}