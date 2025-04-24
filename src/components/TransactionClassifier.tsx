import React, { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';

interface Transaction {
  id: string | number;
  type: string | null;
  description: string | null;
}

interface ClassificationResult {
  id: string | number;
  classification: string;
}

const TransactionTypes = () => {
  const { transactions } = useTransactions();
  const [transactionData, setTransactionData] = useState<Transaction[]>([]);
  const [classificationResults, setClassificationResults] = useState<ClassificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const handleClassifyTransactions = async () => {
    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    
    const extractedData = transactions.map((tx: any, index: number) => ({
      id: tx.id || index,
      type: tx.type || null,
      description: tx.description || null
    }));
  
    setTransactionData(extractedData);

    try {
      console.log('Sending transactions to API:', extractedData.slice(0, 10));
      
      const response = await fetch('/api/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: extractedData.slice(0, 10) }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('\n\n\n\nAPI Response:', data);
      setApiResponse(data);

      try {
        // Try to parse the response text as JSON
        const parsedResults = JSON.parse(data.result);
        setClassificationResults(parsedResults);
      } catch (parseError) {
        console.error('Failed to parse API response:', data.result);
        setClassificationResults([{
          id: 'parse-error',
          classification: `Could not parse results: ${data.result}`
        }]);
      }
    } catch (error) {
      console.error('Error classifying transactions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Transaction Classifier</h2>
      
      <div className="flex space-x-4">
        <button
          onClick={handleClassifyTransactions}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Classifying...
            </span>
          ) : 'Classify 10 Transactions'}
        </button>
      </div>

      {isLoading && (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
          Classifying transactions...
        </div>
      )}
      
      {/* {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <h3 className="font-bold">Error</h3>
          <pre className="whitespace-pre-wrap overflow-x-auto">{error}</pre>
        </div>
      )} */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Original Transaction Data (First 10)</h3>
          <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-sm text-black">
            {JSON.stringify(transactionData.slice(0, 10), null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Classification Results</h3>
          {classificationResults.length > 0 ? (
            <ul className="space-y-2">
              {classificationResults.map((result) => (
                <li key={result.id} className="flex items-baseline space-x-2">
                  <span className="text-gray-600 text-sm">ID: {result.id}</span>
                  <span>-</span>
                  <span className={`font-medium ${
                    result.classification.toLowerCase() === 'income' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.classification}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No classification results yet. Click the button to classify transactions.</p>
          )}
        </div>
      </div>

      {apiResponse && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-3">API Response</h3>
          <details className="group">
            <summary className="flex items-center cursor-pointer text-blue-600 hover:text-blue-800">
              <span className="mr-2">View raw API response</span>
              <svg className="w-4 h-4 group-open:rotate-90 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </summary>
            <pre className="mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto text-sm text-black">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default TransactionTypes;