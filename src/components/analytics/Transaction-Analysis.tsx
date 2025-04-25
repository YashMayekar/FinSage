import { useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEY } from '../TransactionClassifier';
import { processTransactionData } from './Transaction-Summary';

interface Transaction {
    id: string | number;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    description: string | null;
}

const TransactionAnalysis = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEY, []);
  const [unclassifiedTransactions, setUnclassifiedTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof processTransactionData> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for unclassified transactions and update summary
  useEffect(() => {
    updateClassificationStatus();
  }, [transactions]);

  const updateClassificationStatus = () => {
    if (!transactions || transactions.length === 0) {
      setSummary(null);
      return;
    }

    const unclassified = transactions.filter(tx => 
      !tx.type || (tx.type !== 'income' && tx.type !== 'expense')
    );

    setUnclassifiedTransactions(unclassified);

    // Update summary if all transactions are classified
    if (unclassified.length === 0) {
      setSummary(processTransactionData(transactions));
    } else {
      setSummary(null);
    }
  };

  const handleClassifyComplete = () => {
    // Refresh data from local storage
    const updatedTransactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setTransactions(updatedTransactions);
    updateClassificationStatus();
  };

  const prepareAnalysisData = () => {
    if (!summary) return null;
    
    return {
      timeframe: getAnalysisTimeframe(transactions),
      overview: {
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netBalance: summary.netBalance,
        transactionCount: summary.transactionCount,
      },
      categories: {
        income: Object.entries(summary.incomeCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        expenses: Object.entries(summary.expenseCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      },
      notableTransactions: {
        largestIncome: summary.largestIncome,
        largestExpense: summary.largestExpense,
        frequentTransactions: summary.frequentTransactions.slice(0, 3),
      },
      monthlyTrends: summary.monthlyTrends,
    };
  };

  const getAnalysisTimeframe = (transactions: Transaction[]) => {
    if (transactions.length === 0) return 'No timeframe';
    
    const dates = transactions
      .filter(tx => tx.date)
      .map(tx => new Date(tx.date).getTime());
    
    if (dates.length === 0) return 'No valid dates';
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
  };

  const analyzeWithGemini = async () => {
    if (!summary) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      const analysisData = prepareAnalysisData();
      if (!analysisData) {
        throw new Error('No valid data to analyze');
      }
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      const resultText = data.result;
      
      if (!resultText) {
        throw new Error('No analysis result returned from server');
      }
      
      setAnalysisResult(resultText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Classification Alert */}
      {unclassifiedTransactions.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {unclassifiedTransactions.length} unclassified transactions
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please classify these transactions to enable analysis:</p>
                <div className="mt-2 space-y-1">
                  {unclassifiedTransactions.slice(0, 3).map(tx => (
                    <div key={tx.id} className="flex items-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-2">
                        ${tx.amount.toFixed(2)}
                      </span>
                      <span className="truncate max-w-xs">
                        {tx.description || 'No description'}
                        {tx.date && (
                          <span className="text-gray-500 ml-2">
                            {new Date(tx.date).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {unclassifiedTransactions.length > 3 && (
                    <div className="text-gray-500">
                      + {unclassifiedTransactions.length - 3} more...
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClassifyComplete}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  I've Classified Them - Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {transactions.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                No transaction data available
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Add some transactions to begin financial analysis.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Dashboard */}
      {summary && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">Total Income</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                ${summary.totalIncome.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Total Expenses</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">
                ${summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className={`border rounded-lg p-4 ${
              summary.netBalance >= 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm font-medium text-gray-800">Net Balance</p>
              <p className={`mt-1 text-2xl font-semibold ${
                summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${summary.netBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={analyzeWithGemini}
              disabled={isAnalyzing || unclassifiedTransactions.length > 0}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isAnalyzing
                  ? 'bg-blue-400 cursor-not-allowed'
                  : unclassifiedTransactions.length > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze with Gemini AI'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis Results</h2>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatAnalysisResult(analysisResult) }} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatAnalysisResult = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/- (.*?)(<br>|$)/g, '• $1$2')
    .replace(/(\d+\.) (.*?)(<br>|$)/g, '$1 $2$3');
};

export default TransactionAnalysis;