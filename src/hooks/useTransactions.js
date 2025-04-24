// hooks/useTransactions.ts
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import React from 'react';

export function useTransactions() {
  const { data, error, isLoading, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 600000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: false,
  });

  // Memoize the transactions to prevent unnecessary re-renders
  const transactions = React.useMemo(() => data || [], [data]);

  return {
    transactions, // Now this reference stays stable between renders
    isLoading,
    error,
    mutate,
  };
}