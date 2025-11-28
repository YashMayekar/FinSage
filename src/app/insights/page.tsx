'use client';
import { useReactToPrint } from "react-to-print";
import React, { useEffect, useRef, useState } from 'react';
import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
import ReactMarkdown from "react-markdown";
import TransactionTable from '@/components/TransactionTable';
import { X, FileText, Eye, Printer } from 'lucide-react';
import { marked } from 'marked';
import styles from '../Report.module.css';

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
  const {
    analysis,
    isloading,
    InRangeTransactions,
  } = useTransactionAnalysis({ mode, start, end });

  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const reportPreviewRef = useRef<HTMLDivElement | null>(null);
  const reportContentRef = useRef<HTMLDivElement | null>(null);



  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const handlePrint = useReactToPrint({
    contentRef: reportContentRef,
    documentTitle: "Financial Report",
  });

  const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Helper function to load from localStorage
const loadFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  }
  return defaultValue;
};



  // Scroll to bottom of insights when new content arrives
  useEffect(() => {
    if (scrollToBottom && insightsRef.current) {
      insightsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [insights, scrollToBottom]);

  useEffect(() => {
  if (!isStreaming && insights.length > 0) {
    saveToLocalStorage('latest_insights', insights);
  }
}, [isStreaming, insights]);

  // Close floating table if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setShowTable(false);
      }
      if (reportPreviewRef.current && !reportPreviewRef.current.contains(event.target as Node)) {
        setShowReportPreview(false);
      }
      if (insightsRef.current && !insightsRef.current.contains(event.target as Node)) {
        setScrollToBottom(false);
        console.log("Clicked outside insights: Scroll lock disabled - ", scrollToBottom);
      }
    }
    
    if (showTable || showReportPreview) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTable, showReportPreview, scrollToBottom]);

  useEffect(() => {
    if (analysis && !isStreaming && insights.length === 0) {
    const savedInsights = loadFromLocalStorage('latest_insights', '');
      setInsights(savedInsights);
    }
  }, [analysis]);

  if (isloading) return <div>Loading...</div>;
  if (!analysis) return (
        <div className='border p-4 gap-2 rounded-xl flex flex-col justify-center items-center'>
        <h1 className="rounded-xl text-xl font-bold ">Sorry, No transactions found.</h1>
        <h1 className="rounded-xl text-xl font-bold ">Please upload some transactions to see analysis.</h1>
        
        <a href="/transactions" className='text-yellow-300'>Click here to upload transactions</a>
        </div>
      );

  // --- Fetch AI Insights with streaming ---
  async function fetchInsights() {
    if (!analysis) {
      console.error('No analysis/transformed data available');
      return;
    }
    
    setLoading(true);
    setIsStreaming(true);
    setInsights(''); // Clear previous insights
    localStorage.removeItem('latest_insights');
    
    try {
      console.log('\nFetching insights with analysis to : '+`${apiurl}/insights`);
      const res = await fetch(`${apiurl}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: analysis }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsStreaming(false);
          break;
        }

        // Decode the chunk and process it
        const chunk = decoder.decode(value, { stream: true });
        const lines = (buffer + chunk).split('\n');
        buffer = lines.pop() || ''; // Save incomplete line for next chunk

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                
                if (data.chunk) {
                  // Append the chunk to the insights
                  setInsights(prev => prev + data.chunk);
                }
                
                if (data.done) {
                  setIsStreaming(false);
                  break;
                }
              }
            } catch (e) {
              console.warn('Failed to parse SSE line:', line, e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      setInsights(prev => prev + '\n\n**Error:** Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
      setIsStreaming(false);
      saveToLocalStorage('latest_insights', insights);
    }
  }

  // Cancel ongoing stream
  const cancelStream = () => {
    setIsStreaming(false);
    setLoading(false);
  };

  // Helper functions for report generation
  const getDateRangeText = (mode: Mode, start: string, end: string): string => {
    if (mode === 'custom' && start && end) {
      return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
    }
    
    const rangeTexts: Record<Mode, string> = {
      '7d': 'Last 7 days',
      '14d': 'Last 14 days',
      '21d': 'Last 21 days',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      '180d': 'Last 180 days',
      '1y': 'Last 1 year',
      'max': 'Maximum available range',
      'custom': 'Custom range'
    };
    
    return rangeTexts[mode] || 'Unknown range';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-top justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Get Insights from your transactions
          </h1>
          <p className="text-sm opacity-70">
            Plan your finances and track progress using AI insights.
          </p>
        </div>        
      </div>

      <div className="border p-5 rounded-lg space-y-5">
        <div className="flex flex-row gap-5 justify-between items-start sm:items-center">
          <div className="flex flex-col gap-2 items-start">
            <h2 className="text-xl">Set Transaction duration for insights : </h2>
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
                className="px-5 py-2 rounded-lg border hover:ring-1 hover:cursor-pointer transition flex items-center gap-2"
              >
                <Eye size={16} />
                {showTable ? 'Close Preview' : 'Preview Table'}
              </button>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {isStreaming ? (
              <button
                onClick={cancelStream}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Stop Generating
              </button>
            ) : (
              <button
                onClick={fetchInsights}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? 'Loading...' : (
                  <>
                    <FileText size={16} />
                    Generate AI Insights
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {insights && !isStreaming && ( 
          <div className="flex flex-col gap-2 justify-evenly items-center mb-5">
            <h1 className="font-semibold text-lg text-[var(--foreground)] mr-4">
              Your Financial Report has been generated, click below to view.</h1>
                  <div className="flex ">
                    <button
                      onClick={() => setShowReportPreview(true)}
                      className=" px-30 py-2 bg-yellow-300 text-black rounded-lg border hover:ring-1 hover:cursor-pointer hover:bg-yellow-500 transition flex items-center gap-2"
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                    
                  </div>
              </div>
            )}

        {(insights || isStreaming) && (
          <div className="bg-[var(--background)] border rounded p-4 max-w-none text-[var(--foreground)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold self-center text-xl">AI Insights</h2>
              <div className="flex items-center gap-2">
                {isStreaming && (
                  <div className="flex items-center gap-2 text-base text-green-600">
                    <div className="animate-pulse">●</div>
                    <span>Generating...</span>
                  </div>
                )}
                
              </div>
            </div>
            <div ref={insightsRef}>
            <div className="prose prose-lg max-w-none min-h-[100px] max-h-[400px] overflow-y-auto">
              <div className={styles.report}>
              <ReactMarkdown>{insights}</ReactMarkdown>
                </div>
              {isStreaming && (
                <span className="animate-pulse">▊</span>
              )}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating centered table modal */}
      {showTable && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div
            ref={tableRef}
            className="flex flex-col bg-[var(--background)] rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
          > 
            <button
              className="ml-auto mr-2 bg-[var(--background)] text-[var(--foreground)] rounded-full p-2 hover:bg-[var(--border)] transition"
              onClick={() => setShowTable(false)}          
            >
              <X size={18} />
            </button>
            <TransactionTable transactions={InRangeTransactions} />
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showReportPreview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 ">
          <div
            ref={reportPreviewRef}
            className="flex flex-col bg-white text-black rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Report Preview</h2>
              <div className="flex gap-2">
                <button
                      onClick={handlePrint}
                      className="px-5 py-2 rounded-lg border hover:ring-1 hover:cursor-pointer transition flex items-center gap-2"
                    >
                      <Printer size={14} />
                      Print Report
                    </button>
                <button
                  className="ml-2 bg-gray-200 text-gray-700 rounded-full p-2 hover:bg-gray-300 transition"
                  onClick={() => setShowReportPreview(false)}          
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Report Preview Content */}
            <div ref={reportContentRef} className="printable-area">
              <div className="border rounded p-6 bg-white">
                <div className="text-center border-b-2 border-blue-800 pb-4 mb-6">
                  <h1 className="text-2xl font-bold text-blue-800">Financial Insights Report</h1>
                  <p className="text-black text-sm">AI-Powered Financial Analysis</p>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-semibold text-blue-800 bg-gray-100 px-3 py-2 border-l-4 border-blue-800 mb-3">Report Period</h3>
                  <div className='flex flex-row justify-evenly '>
                    <p className='text-black'><strong>Date Range:</strong> {getDateRangeText(mode, start, end)}</p>
                    <p className='text-black'><strong>Total Transactions:</strong> {InRangeTransactions?.length || 0}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-blue-800 bg-gray-100 px-3 py-2 border-l-4 border-blue-800 mb-3">Financial Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="border rounded p-3 text-center bg-white shadow-sm">
                      <div className="font-bold text-blue-800">{formatCurrency(analysis.summary.incomeTotal || 0)}</div>
                      <div className="text-xs text-black">Total Income</div>
                    </div>
                    <div className="border rounded p-3 text-center bg-white shadow-sm">
                      <div className="font-bold text-blue-800">{formatCurrency(analysis.summary.expenseTotal || 0)}</div>
                      <div className="text-xs text-black">Total Expenses</div>
                    </div>
                    <div className="border rounded p-3 text-center bg-white shadow-sm">
                      <div className="font-bold text-blue-800">{formatCurrency(analysis.summary.incomeTotal- analysis.summary.expenseTotal|| 0)}</div>
                      <div className="text-xs text-black">Net Flow</div>
                    </div>
                    {analysis.summary.savingsRate && (
                      <div className="border rounded p-3 text-center bg-white shadow-sm">
                        <div className="font-bold text-blue-800">{analysis.summary.savingsRate.toFixed(1)}%</div>
                        <div className="text-xs text-black">Savings Rate</div>
                      </div>
                    )}
                  </div>
                </div>


                   
                <div className="mb-6">
                  <h3 className="font-semibold text-blue-800 bg-gray-100 px-3 py-2 border-l-4 border-blue-800 mb-3">AI Insights & Analysis</h3>
                  <div className={`${styles.report} text-black border-b-2 px-3 pb-7 border-blue-800`}>
                  {insights ? (
                    <div dangerouslySetInnerHTML={{ __html: String(marked(insights))}} />
                  ) : (
                    <p className="text-black italic">No insights available</p>
                  )}
                </div>
                </div>
                <div className="text-right text-black text-xs mt-4">
                  Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}