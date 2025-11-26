'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
import ReactMarkdown from "react-markdown";
import TransactionTable from '@/components/TransactionTable';
import AnalyzeTransactions from '@/analytics/AnalyzeTransactions';
import useTransactions from '@/hooks/useTransactions';

const apiurl = process.env.NEXT_PUBLIC_API_URL;

type Mode =
  | '7d'
  | '14d'
  | '21d'
  | '30d'
  | '90d'
  | '180d'
  | '1y'
  | 'max'
  | 'custom';

export default function Insights() {
  const [mode, setMode] = useState<Mode>('90d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const { processedTransactions: ProcessedTransactions, RefreshProcessedData } =
    useTransactions();

  const {
    analysis,
    isloading,
    InRangeTransactions,
  } = useTransactionAnalysis({ mode });

  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [usePT, setUsePT] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // Close floating table if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tableRef.current &&
        !tableRef.current.contains(event.target as Node)
      ) {
        setShowTable(false);
      }
    }
    if (showTable) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTable]);

  if (isloading) return <div>Loading...</div>;
  if (!analysis) return <div>No data available</div>;

  // --- Fetch AI Insights (general) ---
  async function fetchInsights() {
    let Data = [];
    if (!analysis) return;
    else if (usePT) {
      if (!ProcessedTransactions || ProcessedTransactions.length === 0) {
        alert("No Processed Transactions available! Please process your transactions first.");
        return;
      }
      Data = ProcessedTransactions;  
    } 
    else Data = InRangeTransactions;
    setLoading(true);
    try {
      const res = await fetch(`${apiurl}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: Data }),
      });
      const data = await res.json();
      if (data.insights) setInsights(data.insights);
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  }

  const HPD = () => {
    console.log("TEST from insights page:")
    console.log("Type of processed transaction: \n", typeof ProcessedTransactions,ProcessedTransactions );
    console.log("Type of raw transaction: \n", typeof InRangeTransactions, InRangeTransactions);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <button onClick={RefreshProcessedData}>Refresh process</button>
      <div className="flex flex-col sm:flex-row items-start sm:items-top justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Get Insights from your transactions
          </h1>
          <p className="text-sm opacity-70">
            Plan your finances and track progress using AI insights.
          </p>
        </div>

        <div className="flex flex-col items-start">
          <h2 className="">Set Transaction duration for insights : </h2>
          <div className="flex flex-row items-center gap-2">
            <select
              className="text-[var(--foreground)] bg-[var(--background)] border rounded-lg px-3 py-2 hover:ring-1 hover:cursor-pointer transition"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <optgroup label="Weekly">
                <option value="7d">Last 1 week</option>
                <option value="14d">Last 2 weeks</option>
                <option value="21d">Last 3 weeks</option>
              </optgroup>
              <optgroup label="Monthly">
                <option value="30d">Last 1 month</option>
                <option value="90d">Last 3 months</option>
                <option value="180d">Last 6 months</option>
              </optgroup>
              <optgroup label="Yearly">
                <option value="1y">Last 1 year</option>
                <option value="max">Max Date Range</option>
              </optgroup>
              <optgroup label="Custom">
                <option value="custom">Select Range</option>
              </optgroup>
            </select>
            {mode === 'custom' && (
              <>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </>
            )}
            <button
              onClick={() => {
                setShowTable((prev) => !prev);
              }}
              className="px-5 py-2 rounded-lg border hover:ring-1 hover:cursor-pointer transition"
            >
              {showTable ? 'Close Preview' : 'Preview Table'}
            </button>
          </div>
        </div>
      </div>

      <AnalyzeTransactions transactions={InRangeTransactions} />

      <div className="border p-5 rounded-lg space-y-5">
        <div className="flex flex-row justify-between items-start sm:items-center ">
          <h2 className="text-lg"> Get Insights about your transactions</h2>

          <div className="flex flex-row justify-between items-center gap-3">
            <p>Use Processed Transactions for insights?</p>
            <input
              onChange={() => setUsePT((prev) => !prev)}
              type="checkbox"
              className="w-5 h-5 border rounded-lg focus:ring-blue-500"
              checked={usePT}
            />
            <button
              onClick={fetchInsights}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? 'Loading...' : 'Generate AI Insights'}
            </button>
          </div>
        </div>
        {insights && (
          <div className="bg-[var(--background)] border rounded p-4 prose prose-sm max-w-none text-[var(--foreground)]">
            <h2 className="font-semibold mb-2">AI Insights</h2>
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Floating centered table modal */}
      {showTable && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div
            ref={tableRef}
            className="bg-[var(--background)] rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
          >
            <TransactionTable transactions={InRangeTransactions} />
          </div>
        </div>
      )}

      <button onClick={HPD}>Check transactions</button>
      <TransactionTable transactions={ProcessedTransactions} />
    </div>
  );
}
