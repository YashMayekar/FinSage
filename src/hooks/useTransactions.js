'use client'; // 👈 Required for SWR (client-side hook)

import useSWR from 'swr'; // ✅ SWR v2+ uses default export
import React from 'react';

export const fetcher = (...args) => fetch(...args).then(res => res.json());

export function useTransactions() {
  const { data, error, isLoading, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 600000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const transactions = React.useMemo(() => data || [], [data]);

  return {
    transactions,
    isLoading,
    error,
    mutate,
  };
}
export default useTransactions; // Export the hook for use in components
