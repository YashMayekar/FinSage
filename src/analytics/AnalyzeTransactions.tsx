'use client';
import React, { useState, useCallback, useRef } from 'react';
import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
import TransactionTable from '@/components/TransactionTable';
import useTransactions from '@/hooks/useTransactions';
import toast from 'react-hot-toast';


const apiurl = process.env.NEXT_PUBLIC_API_URL;

interface ProTransaction {
  date: string;
  description: string | null;
  cleanedDescription?: string;
  category?: string;
  type: 'income' | 'expense';
  amount: number;
  additionalData: string | null;
}

export type Txn = {
  date: string;
  description: string | null;
  type: 'income' | 'expense';
  amount: number;
  additionalData: string | null;
};

export type AnalyzedTxn = Txn & {
  category?: string;
  cleanedDescription?: string;
};

type AnalysisResponse = {
  rawResponse?: string;
  parsedData?: AnalyzedTxn[];
  error?: string;
  duration: number;
};

interface AnalyzeTransactionsProps {
  transactions?: Txn[]; // Add optional transactions prop
}

const AnalyzeTransactions: React.FC<AnalyzeTransactionsProps> = ({ transactions: propTransactions }) => {
  const protransformed: ProTransaction[] = [];
  
  const { transactions: hookTransactions, isLoading, error, mutate } = useTransactions();
  
  const [ProcessedTransactions, setProcessedTransactions] = useState<AnalyzedTxn[]>([]);

  // Use propTransactions if provided, otherwise use hookTransactions
  const Transactions = propTransactions || hookTransactions;

  // const { saveProcessedTransactions } = useTransactions();
  

  const BATCH_SIZE = Math.ceil(Transactions.length / 5) ;
  const [showTable, setshowTable] = useState(false);
  
  const [rawResponses, setRawResponses] = useState<string[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // const [batchTimings, setBatchTimings] = useState<number[]>([]);
  // const [showRawResponses, setShowRawResponses] = useState(false);
  const stopRequested = useRef(false);


  const saveProcessedTransactions = React.useCallback((transactions: AnalyzedTxn[]) => {
    // console.log("\nEntered the save locally function")
    // console.log("The data : ", transactions)
    console.log('TYPE of PROCESSED data getting stored: ', typeof transactions)

    try {
        localStorage.setItem('processedTransactions', JSON.stringify(transactions));
        toast.success('Processed transactions saved!');
      } catch (e) {
        console.error('Failed to save processed transactions:', e);
        toast.error('Failed to save processed transactions');
      }
    }, []);
    

  const analyzeBatch = useCallback(async (txs: Txn[]): Promise<AnalysisResponse> => {
    const startTime = performance.now();
    try {
      const response = await fetch(`${apiurl}/analyze-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txs),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawText = await response.text();
      // console.log('Raw API Response:', rawText);

      let parsedData;
      let jsonResponse;

      // Try to parse as JSON first
      try {
        jsonResponse = JSON.parse(rawText);
      } catch (e) {
        throw new Error('Response is not valid JSON');
      }

      // Store the raw response
      setRawResponses(prev => [...prev, rawText]);

      console.log("\nLLM Model : ", jsonResponse.model_used)
      // Handle different response formats
      if (Array.isArray(jsonResponse)) {
        parsedData = jsonResponse;
      } else if (jsonResponse.analysis) {
        // Handle analysis property (could be string or object)
        if (typeof jsonResponse.analysis === 'string') {
          try {
            // Try to extract JSON from code blocks
            const jsonMatch = jsonResponse.analysis.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              parsedData = JSON.parse(jsonMatch[1]);
            } else {
              parsedData = JSON.parse(jsonResponse.analysis);
            }
          } catch (parseError) {
            console.error('Failed to parse analysis string:', parseError);
            throw new Error('Invalid JSON in analysis field');
          }
        } else if (Array.isArray(jsonResponse.analysis)) {
          parsedData = jsonResponse.analysis;
        } else {
          throw new Error('Unexpected analysis field format');
        }
      } else if (jsonResponse.result || jsonResponse.data) {
        // Handle other common response formats
        const data = jsonResponse.result || jsonResponse.data;
        if (Array.isArray(data)) {
          parsedData = data;
        } else {
          throw new Error('Unexpected response structure');
        }
      } else {
        throw new Error('Unknown response format');
      }

      if (!Array.isArray(parsedData)) {
        throw new Error('Analysis did not return an array');
      }

      const endTime = performance.now();
      return { 
        rawResponse: rawText, 
        parsedData, 
        duration: endTime - startTime 
      };
    } catch (err) {
      const endTime = performance.now();
      console.error('Batch analysis failed:', err);
      return { 
        error: err.message || err.toString(), 
        duration: endTime - startTime 
      };
    }
  }, []);

  const startAnalysis = async () => {
    if (!Transactions || Transactions.length === 0) {
      // Only refresh if we're using hook transactions
      if (!propTransactions) {
        await mutate();
      }
      if (!Transactions || Transactions.length === 0) return;
    }

    stopRequested.current = false;
    setLoadingAnalysis(true);
    setAnalyzedCount(0);
    setAnalysisError(null);
    setProcessedTransactions([]);
    setRawResponses([]);
    // setBatchTimings([]);

    const batches = Array.from(
      { length: Math.ceil(Transactions.length / BATCH_SIZE) },
      (_, i) => Transactions.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );
    
    try {
      for (let i = 0; i < batches.length; i++) {
        if (stopRequested.current) {
          console.log('Analysis stopped by user.');
          break;
        }

        const batch = batches[i];
        const result = await analyzeBatch(batch);
        
        // setBatchTimings((prev) => [...prev, result.duration]);

        if (result.error) {
          console.error(`Batch ${i + 1} failed:`, result.error);
          setAnalysisError(`Batch ${i + 1} failed: ${result.error}`);
          continue;
        }


        if (result.parsedData) {
          result.parsedData.forEach((item: any, index: number) => {
            const row = batch[index]; // original row from batch

            // create a base row using your existing "newRow" logic
            const newRow: Partial<ProTransaction> = {
              date: row?.date, // or columnMapping.date if needed
              description: row?.description || null,
              type: row?.type || null,
              amount: row?.amount || 0,
              additionalData: row?.additionalData || null,
            };

            // enrich it with AI + batch values
            newRow.cleanedDescription = item.description || null;
            newRow.category = item.category || "uncategorized";
            
            console.log("The new row getting pushed: ", newRow)
            // push into the transformed list
            protransformed.push(newRow as ProTransaction);
          });
        }



          // newRow.date = newTransactions.map

          // Append results to global state
          // protransformed.push(newRow as ProTransaction)

          // setProcessedTransactions((prev) => [...prev, ...newTransactions]);
          setAnalyzedCount((prev) => prev + result.parsedData!.length);
          
          // try{
          //   saveProcessedTransactions([...ProcessedTransactions, ...newTransactions]);
          // } catch (err){
          //   console.error('Failed to store processed data locally:', err);      
          // }

        // }
      }
      console.log('TEST for prodata gaps: ', protransformed)
      saveProcessedTransactions(protransformed)
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


  const downloadProcessedTransactions = () => {
    // Convert analyzed transactions to CSV
    const headers = ['Date','Description','Cleaned Description', 'Type',  'Amount', 'Category', 'Additional Data'];
    const csvData = ProcessedTransactions.map(tx => [
      tx.date,
      tx.description,
      `"${tx.cleanedDescription?.replace(/"/g, '""') || ''}"`,
      tx.type,
      tx.amount,
      tx.category,
      `"${tx.additionalData?.replace(/"/g, '""') || ''}"`
    ].join(','));

    const csvContent = [headers.join(','), ...csvData].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'analyzed_transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='border p-5 rounded-lg space-y-5'>

    <div className='flex flex-row justify-between items-start sm:items-center '>
      
      <h2 className='text-lg'>Process your  transactions by AI for better Insights</h2>

    <div className="flex flex-row gap-2 items-start sm:items-center">
      {/* {loadingAnalysis ? (
        <h2 className="text-xl font-semibold mb-4">Analyzing...</h2>
      ) : (
        <h2 className="text-xl font-semibold mb-4">Analyze Transactions</h2>
      )} */}


      {!isLoading && !loadingAnalysis && (
        <button
        onClick={startAnalysis}
        className="text-[var(--foreground)] p-2 px-5 border border-[var(--border)] rounded-md hover:border-neutral-700 transition-all duration-200 ease-out cursor-pointer"
        disabled={Transactions?.length === 0}
        >
          {ProcessedTransactions.length > 0 ? 'Process Again': 'Process'}
        </button>
      )}

      
      {ProcessedTransactions.length > 0 && (
        <button  
        onClick={() => {
          setshowTable(prev => !prev)
        }}
        className="px-5 py-2 rounded-lg border hover:border-2 hover:cursor-pointer transition"
        >
              {showTable? "Close" : "View" }
      </button>
      )}

      {ProcessedTransactions.length > 0 && (
        <button
              onClick={downloadProcessedTransactions}
              className="text-green-600 p-2 px-5 border border-green-600 rounded-md hover:bg-green-100 transition-all duration-200 ease-out cursor-pointer"
            >
              Download
            </button>
      )}
      
      </div>
      </div>
      {isLoading && !propTransactions && <p>Loading Transactions...</p>}
      
      {error && !propTransactions && <p className="text-red-500">Error loading Transactions: {error.message}</p>}

      {analysisError && <p className="text-red-500">{analysisError}</p>}


      {/* Raw Responses Toggle */}
      {/* {rawResponses.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowRawResponses(!showRawResponses)}
            className="text-blue-500 p-2 px-5 border border-blue-500 rounded-md hover:bg-blue-100 transition-all duration-200 ease-out cursor-pointer"
          >
            {showRawResponses ? 'Hide Raw Responses' : 'Show Raw Responses'}
          </button>
          <button
            onClick={copyRawResponses}
            className="ml-2 text-green-500 p-2 px-5 border border-green-500 rounded-md hover:bg-green-100 transition-all duration-200 ease-out cursor-pointer"
          >
            Copy Raw Responses
          </button>
        </div>
      )} */}

      {/* Raw Responses Display */}
      {/* {showRawResponses && rawResponses.length > 0 && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Raw LLM Responses</h3>
          {rawResponses.map((response, index) => (
            <div key={index} className="mb-4 p-3 bg-white rounded border">
              <h4 className="font-medium mb-2">Batch {index + 1}:</h4>
              <pre className="text-xs overflow-auto max-h-60 p-2 bg-gray-50 rounded">
                {response}
              </pre>
            </div>
          ))}
        </div>
      )} */}

      

       {/* {ProcessedTransactions.length > 0 && (
        <>
          <div className="mb-4 p-2 bg-[var(--background)] rounded text-[var(--foreground)]">
            <p>Performance Metrics:</p>
            <ul className="text-sm">
              <li>Total transactions: {Transactions.length}</li>
              <li>Analyzed transactions: {ProcessedTransactions.length}</li>
              <li>Total batches: {batchTimings.length}</li>
              <li>Total time: {batchTimings.reduce((sum, time) => sum + time, 0).toFixed(2)}ms</li>
              <li>
                Average batch time:{' '}
                {(
                  batchTimings.reduce((sum, time) => sum + time, 0) /
                  batchTimings.length
                ).toFixed(2)}
                ms
              </li>
              <li>Batch size: {BATCH_SIZE}</li>
              <li>Raw responses stored: {rawResponses.length}</li>
              </ul>
              
              
              </div>
              
              
              
              <p className="mt-4">
              Analysis completed in{' '}
              {batchTimings.length > 0
              ? batchTimings.reduce((sum, time) => sum + time, 0).toFixed(2)
              : '0.00'}
              ms
          </p>
          </>
          )}  */}




        {loadingAnalysis && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded overflow-hidden mb-2">
            <div
              className="bg-blue-500 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${(analyzedCount / Transactions.length) * 100}%` }}
            ></div>
          </div>
          <p className="mb-2">
            {analyzedCount} of {Transactions.length} Transactions analyzed
          </p>
          <button
            onClick={stopAnalysis}
            className="text-red-500 p-2 px-5 border border-red-500 rounded-md hover:bg-red-100 transition-all duration-200 ease-out cursor-pointer"
          >
            Stop Analysis
          </button>
        </div>

      )}

         { showTable && <TransactionTable transactions={ProcessedTransactions} />}
      

    </div>
  
  );
};

export default AnalyzeTransactions;