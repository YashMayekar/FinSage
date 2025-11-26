'use client';

import useSWR from 'swr';
import React from 'react';
import { toast } from 'react-hot-toast';

export const fetcher = (...args) => fetch(...args).then(res => res.json());

export function useTransactions() {
  const [localData, setLocalData] = React.useState(null);
  const [processedData, setprocessedData] = React.useState([]);
  const [checkedLocal, setCheckedLocal] = React.useState(false);

  // ✅ Check localStorage first
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('transformedTransactions');
      const processed = localStorage.getItem('processedTransactions')
      if (stored) {
        setLocalData(JSON.parse(stored));
      } 
      else {
        toast('No local transactions found. Fetching from cloud…');
      }

      if (processed) {
        setprocessedData(JSON.parse(processed))
        console.log("local Processed transactions found!")
      } else {
        toast('No local Processed transactions found.');
      }
    } catch (e) {
      console.warn('Failed to read localStorage:', e);
    } finally {
      setCheckedLocal(true);
    }
  }, []);


  const RefreshProcessedData = () => {
    const processed = localStorage.getItem('processedTransactions')
    if (processed) {
        setprocessedData(processed)
        console.log("local Processed transactions, Type: ",typeof processedData)
        console.log("local raw transactions, Type: ", typeof localData)

      } else {
        toast('No local Processed transactions found.');
      } 
  } 



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
  if (Array.isArray(localData)) return localData;
  if (Array.isArray(data)) return data;
  return []; // always fallback to []
}, [localData, data]);

  const processedTransactions = React.useMemo(() => {
if (Array.isArray([processedData])) return processedData;
  return []; // always fallback to []
}, [processedData]); 

 console.log(`Checking the types getting sent from ${typeof processedData} to ${typeof processedTransactions}`)


  return {
    transactions,
    processedTransactions,
    isLoading: !checkedLocal || (isLoading && !localData),
    error,
    mutate,
    RefreshProcessedData,
  };
}

export default useTransactions;
