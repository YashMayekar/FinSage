'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useTransactions() {
  const { data, error, isLoading, mutate } = useSWR('/api/transactions', fetcher, {
    // Refresh data every 10 minutes
    refreshInterval: 600000,
    // Revalidate when window gets focus
    revalidateOnFocus: true,
    // Revalidate when network connection is restored
    revalidateOnReconnect: true,
    // Don't revalidate on mount if there's stale data
    revalidateIfStale: false,
  });
  console.log('\n\n\ntransactions data: ', data, '\n\n\n');

  return {
    transactions: data || [],
    isLoading,
    error,
    mutate, // Allows manual revalidation
  };
}