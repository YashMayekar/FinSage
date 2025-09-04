'use client';

import useSWR from 'swr';
import React from 'react';
import { toast } from 'react-hot-toast';

export const fetcher = (...args) => fetch(...args).then(res => res.json());

export function useTransactions() {
  const [localData, setLocalData] = React.useState(null);
  const [checkedLocal, setCheckedLocal] = React.useState(false);

  // ✅ Check localStorage first
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('transformedTransactions');
      if (stored) {
        setLocalData(JSON.parse(stored));
      } else {
        toast('No local transactions found. Fetching from cloud…');
      }
    } catch (e) {
      console.warn('Failed to read localStorage:', e);
    } finally {
      setCheckedLocal(true);
    }
  }, []);

  // ✅ Only call SWR if no local data
  const { data, error, isLoading, mutate } = useSWR(
    !localData && checkedLocal ? '/api/transactions' : null,
    fetcher,
    {
      refreshInterval: 600000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // ✅ Merge logic: prefer localData if present
  const transactions = React.useMemo(() => {
    if (localData) return localData;
    return data || [];
  }, [localData, data]);

  return {
    transactions,
    isLoading: !checkedLocal || (isLoading && !localData),
    error,
    mutate,
  };
}

export default useTransactions;
