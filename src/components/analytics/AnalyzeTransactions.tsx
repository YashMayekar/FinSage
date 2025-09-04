'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import useTransactions from '@/hooks/useTransactions';

interface Transaction {
  id?: string;
  date: string;
  type: string;
  category: string;
  amount: number;
}

const BATCH_SIZE = 3;

const AnalyzedTransactions: React.FC = () => {
  const { transactions, isLoading, error, mutate } = useTransactions();
  const [analyzedTransactions, setAnalyzedTransactions] = useState<Transaction[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [batchTimings, setBatchTimings] = useState<number[]>([]);
  const stopRequested = useRef(false);

  // Check if transactions are loaded when component mounts
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      mutate();
    }
  }, [transactions, mutate]);

  const analyzeBatch = useCallback(async (txs: Transaction[]) => {
    const startTime = performance.now();
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txs),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      return { data, duration: endTime - startTime };
    } catch (err) {
      const endTime = performance.now();
      console.error('Batch analysis failed:', err);
      throw { error: err, duration: endTime - startTime };
    }
  }, []);

  const startAnalysis = async () => {
    if (!transactions || transactions.length === 0) {
      await mutate();
      if (!transactions || transactions.length === 0) return;
    }

    stopRequested.current = false;
    setLoadingAnalysis(true);
    setAnalyzedCount(0);
    setAnalysisError(null);
    setAnalyzedTransactions([]);
    setBatchTimings([]);

    const batches = Array.from({ length: Math.ceil(120 / BATCH_SIZE) }, (_, i) =>
      transactions.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    const analyzed: Transaction[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        if (stopRequested.current) {
          console.log('Analysis stopped by user.');
          break;
        }

        const batch = batches[i];
        try {
          const { data: results, duration } = await analyzeBatch(batch);
          console.log(`Batch ${i + 1} analyzed in ${duration.toFixed(2)}ms`);
          setBatchTimings((prev) => [...prev, duration]); // 👈 live update here

          results.forEach((item: any, index: number) => {
            const originalTx = batch[index];
            if (originalTx) {
              analyzed.push({
                id: item.id || originalTx.id,
                type: item.type,
                category: item.category,
                amount: originalTx.amount,
                date: originalTx.date,
              });
            }
          });

          setAnalyzedCount(analyzed.length);
        } catch (err) {
          const errorWithDuration = err as { error?: number; duration?: Error };
          console.error(`Batch ${i + 1} failed:`, errorWithDuration.error || err);
        }
      }

      setAnalyzedTransactions(analyzed);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisError('Failed to analyze transactions.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const stopAnalysis = () => {
    stopRequested.current = true;
    setLoadingAnalysis(false);
  };

  return (
    <div className="p-4">
      {loadingAnalysis ? (
        <h2 className="text-xl font-semibold mb-4">Analyzing...</h2>
      ) : (
        <h2 className="text-xl font-semibold mb-4">Analyze Transactions</h2>
      )}

      {isLoading && <p>Loading transactions...</p>}

      {error && (
        <p className="text-red-500">Error loading transactions: {error.message}</p>
      )}

      {!isLoading && !loadingAnalysis && (
        <button
          onClick={startAnalysis}
          className="text-[var(--foreground)] p-2 px-5 border border-[var(--border)] rounded-md hover:border-neutral-700 transition-all duration-200 ease-out cursor-pointer"
          disabled={transactions?.length === 0}
        >
          Start Analysis
        </button>
      )}

      {loadingAnalysis && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded overflow-hidden mb-2">
            <div
              className="bg-blue-500 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${(analyzedCount / transactions.length) * 100}%` }}
            ></div>
          </div>
          <p className="mb-2">
            {analyzedCount} of {transactions.length} transactions analyzed
          </p>
          <button
            onClick={stopAnalysis}
            className="text-red-500 p-2 px-5 border border-red-500 rounded-md hover:bg-red-100 transition-all duration-200 ease-out cursor-pointer"
          >
            Stop Analysis
          </button>
        </div>
      )}

      {analysisError && (
        <p className="text-red-500">{analysisError}</p>
      )}

      {analyzedTransactions.length > 0 && (
        <>
          <div className="mb-4 p-2 bg-gray-100 rounded">
            <p>Performance Metrics:</p>
            <ul className="text-sm">
              <li>Total batches: {batchTimings.length}</li>
              <li>Total time: {batchTimings.reduce((sum, time) => sum + time, 0).toFixed(2)}ms</li>
              <li>Average batch time: {(batchTimings.reduce((sum, time) => sum + time, 0) / batchTimings.length).toFixed(2)}ms</li>
              <li>Batch size: {BATCH_SIZE}</li>
            </ul>
          </div>
          <ul className="list-none p-0">
            {analyzedTransactions.map((tx) => (
              <li
                key={tx.id}
                className="py-2 border-b border-gray-200"
              >
                {tx.date} | {tx.type} | {tx.category} | ₹{tx.amount}
              </li>
            ))}
          </ul>
          {/* Show analysis completed time below */}
          <p>
            Analysis completed in {batchTimings.length > 0 ? batchTimings.reduce((sum, time) => sum + time, 0).toFixed(2) : '0.00'}ms
          </p>
        </>
      )}
    </div>
  );
};

export default AnalyzedTransactions;