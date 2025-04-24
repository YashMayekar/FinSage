'use client'
import React, { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';

interface Transaction {
  id: string | number;
  date: string;
  amount: number;
  description: string | null;
}

interface ClassifiedTransaction extends Transaction {
  type: 'income' | 'expense'; // The classified type
  status: 'completed' | 'failed';
}

const BATCH_SIZE = 5;
const RETRY_DELAY = 3000;
const MAX_RETRIES = 3;
const STORAGE_KEY = 'classifiedTransactionsData';

const TransactionTypes = () => {
  const { transactions, isLoading: isTransactionsLoading } = useTransactions();
  const [classifiedData, setClassifiedData] = useState<ClassifiedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load classified data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setClassifiedData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved classified data', e);
      }
    }
  }, []);

  // Save classified data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classifiedData));
  }, [classifiedData]);

  const classifyBatch = async (batch: Transaction[]): Promise<ClassifiedTransaction[]> => {
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        const response = await fetch('/api/llm/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactions: batch }),
        });

        if (response.status === 429) {
          throw new Error('rate_limit');
        }

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const results = JSON.parse(data.result);

        return batch.map(tx => {
          const result = results.find((r: any) => r.id === tx.id);
          if (!result) {
            throw new Error('Missing classification result');
          }

          return {
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            description: tx.description,
            type: result.classification === 'income' ? 'income' : 'expense',
            status: 'completed'
          };
        });

      } catch (error) {
        if (error instanceof Error && error.message === 'rate_limit' && retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          retryCount++;
          continue;
        }

        // Return failed transactions (without type) if all retries exhausted
        return batch.map(tx => ({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          type: 'income', // Default value
          status: 'failed'
        }));
      }
    }

    return []; // Should never reach here
  };

  const processTransactions = async (transactionsToProcess: Transaction[]) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Filter out already successfully classified transactions
      const unclassified = transactionsToProcess.filter(tx => 
        !classifiedData.some(ct => ct.id === tx.id && ct.status === 'completed')
      );

      for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
        const batch = unclassified.slice(i, i + BATCH_SIZE);
        setProgress(Math.floor((i / unclassified.length) * 100));

        const processedBatch = await classifyBatch(batch);
        
        // Only keep successfully classified transactions
        const successfulClassifications = processedBatch.filter(tx => tx.status === 'completed');
        
        setClassifiedData(prev => [
          ...prev.filter(ct => !batch.some(tx => tx.id === ct.id)),
          ...successfulClassifications
        ]);
      }

      setProgress(100);
    } catch (error) {
      console.error('Processing failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClassifySample = () => processTransactions(transactions.slice(0, 10));
  const handleClassifyAll = () => processTransactions(transactions);

  // Helper to get classified type for display
  const getClassifiedType = (id: string | number) => {
    return classifiedData.find(tx => tx.id === id)?.type || null;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Controls */}
      <div className="flex space-x-4">
        <button
          onClick={handleClassifySample}
          disabled={isProcessing || isTransactionsLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Classify Sample (10)
        </button>
        <button
          onClick={handleClassifyAll}
          disabled={isProcessing || isTransactionsLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isProcessing ? `Processing... ${progress}%` : 'Classify All'}
        </button>
      </div>

      {/* Progress and Error */}
      {isProcessing && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <h3 className="font-bold">Error</h3>
          <pre className="whitespace-pre-wrap overflow-x-auto text-sm">{error}</pre>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classified Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx: any) => {
              const classifiedType = getClassifiedType(tx.id);
              return (
                <tr key={tx.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {classifiedType ? (
                      <span className={`${
                        classifiedType === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {classifiedType}
                      </span>
                    ) : (
                      <span className="text-gray-500">Not classified</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Export the storage key for access from other components
export { STORAGE_KEY };
export default TransactionTypes;