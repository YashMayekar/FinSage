import useSWR from 'swr';
import React from 'react';

// Basic fetcher with error handling
const fetcher = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    const errorDetails = await res.json().catch(() => ({}));
    const error = new Error(
      errorDetails?.error || `Failed to fetch from ${url}`
    );
    error.info = errorDetails;
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export function useTransactions() {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 600000, // 10 minutes
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
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
