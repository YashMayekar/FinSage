// This file uploads and processes CSV files containing transaction data.
// It needs to get faster and more robust.
'use client';
import { useState, useMemo } from 'react';
import { parse } from 'papaparse';
import { File, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';


interface Transaction {
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: string | number | null | undefined;
}

export default function HandleData() {
  // State management
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    description: '',
    amount: '',
    type: '',
    additionalData: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [hasTypeColumn, setHasTypeColumn] = useState<boolean | null>(null);
  const [incomeColumn, setIncomeColumn] = useState<string>('');
  const [expenseColumn, setExpenseColumn] = useState<string>('');
  const [transformedData, setTransformedData] = useState<Transaction[]>([]); // Transformed data after processing
  const [skippedRows, setSkippedRows] = useState<number[]>([]);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [storageChoicePrompt, setStorageChoicePrompt] = useState(false);
  const [isSubmittingToServer, setIsSubmittingToServer] = useState(false);


  // Derived values
  const requiredFields = hasTypeColumn 
    ? ['date', 'type', 'amount'] 
    : ['date', incomeColumn, expenseColumn].filter(Boolean);

  // Reset file input reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear all state
  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setPreviewData([]);
    setUploadComplete(false);
    setTransformedData([]);
    // setHasTypeColumn(null);
    // setIncomeColumn('');
    // setExpenseColumn('');
    setSkippedRows([]);
    setShowDownloadPrompt(false);
  };


  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    
    parse(selectedFile, {
      header: true,
      complete: (results) => {
        const data = results.data as any[];

        if (data.length > 0) {
          setCsvData(data);
          setHeaders(Object.keys(data[0]));
          setPreviewData(data.slice(0,5));
          setUploadComplete(false);
          setHasTypeColumn(null);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      },
    });
  };
  
  // Handle column mapping changes
  const handleColumnMapping = (field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Check if all required fields are mapped
  const allRequiredFieldsMapped = useMemo(() => {
    if (hasTypeColumn) {
      return ['date', 'type', 'amount'].every(field => columnMapping[field]);
    } else {
      return incomeColumn && expenseColumn;
    }
  }, [columnMapping, hasTypeColumn, incomeColumn, expenseColumn]);
  
  // Transform CSV data to our format
  let i = 0;
  const transformData = () => {
    const skipped: number[] = [];
    const validData = csvData.filter((row, index) => {
      try {
        console.log("columnMapping.date : ", columnMapping.date)
        console.log("ROWcolumnMapping.date : ", row[columnMapping.date])

        const hasDate = columnMapping.date && row[columnMapping.date];
        let isValid = false;
        
        if (hasTypeColumn) {
          isValid = columnMapping.type && columnMapping.amount &&
          row[columnMapping.type] && row[columnMapping.amount];
        } else {
          isValid = (incomeColumn && row[incomeColumn]) || 
          (expenseColumn && row[expenseColumn]);
         // console.log("ROW isValid: ", i += 1)
         // works good
        }
        
        if (!hasDate || !isValid) {
          skipped.push(index);
          return false;
        }
        
        // Date validation
        // const testDate = new Date(row[columnMapping.date]);
        // if (isNaN(testDate.getTime())) {
        //   console.warn(`Invalid date at row ${index + 1}: ${row[columnMapping.date]}`);
        //   skipped.push(index);
        //   return false;
        // }
        
        return true;
      } catch {
        skipped.push(index);
        return false;
      }
    });
    
    setSkippedRows(skipped);
    
    console.log("The length of validData: ", validData.length);

    return validData.map(row => {
      const newRow: Partial<Transaction> = {
        date: formatDate(row[columnMapping.date]),
        description: columnMapping.description ? 
        String(row[columnMapping.description]).substring(0, 255) : 
        null,
        additionalData: null
      };
      
      // Additional data fallback
      if (columnMapping.additionalData) {
        newRow.additionalData = row[columnMapping.additionalData] ?? null;
      } else {
        const additionalFields = headers.filter(
          h => !Object.values(columnMapping).includes(h) &&
          h !== incomeColumn &&
          h !== expenseColumn
        );
        if (additionalFields.length > 0) {
          newRow.additionalData = additionalFields
          .map(f => `${f}:${row[f]}`)
          .join('; ');
        }
      }
      
      // Handle type & amount
      if (hasTypeColumn) {
        newRow.type = String(row[columnMapping.type]);
        newRow.amount = parseFloat(String(row[columnMapping.amount]).replace(/,/g, '')) || 0;
      } else {
        const income = incomeColumn ? 
        parseFloat(String(row[incomeColumn]).replace(/,/g, '')) || 0 : 0;
        const expense = expenseColumn ? 
        parseFloat(String(row[expenseColumn]).replace(/,/g, '')) || 0 : 0;
        
        if (income > 0) {
          newRow.type = 'income';
          newRow.amount = income;
        } else {
          newRow.type = 'expense';
          newRow.amount = expense;
        }
      }
      
      return newRow as Transaction;
    });
  };
  
  // Format date to DD-MM-YYYY
  const formatDate = (input: string): string => {
    try {
      if (!input || typeof input !== 'string') return input;

      let date: Date | null = null;

      // Normalize separators
      const normalized = input.trim().replace(/\/|\\/g, '-');

      const parts = normalized.split('-');

      // Try DD-MM-YYYY or similar (if day is likely <= 31)
      if (parts.length === 3) {
        const [part1, part2, part3] = parts.map(p => parseInt(p, 10));
        
        if (part1 > 31) {
          // Likely YYYY-MM-DD
          date = new Date(input);
        } else if (part3 > 31) {
          // DD-MM-YYYY or MM-DD-YYYY
          date = new Date(`${part3}-${part2}-${part1}`);
        } else {
          // Fallback to natural parsing
          date = new Date(normalized);
        }
      } else {
        // Fallback to native parser (for ISO, etc.)
        date = new Date(normalized);
      }

      if (!date || isNaN(date.getTime())) throw new Error('Invalid date');

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
    } catch (error) {
      console.warn('Date formatting failed for:', input);
      return input; // Return original if all else fails
    }
  };



  // Generate CSV content
  const generateCSVContent = (data: Transaction[]) => {
    const csvHeaders = ['date', 'description', 'type', 'amount', 'additionalData'];
    return [
      csvHeaders.join(','),
      ...data.map(row => csvHeaders.map(header => 
        header === 'amount' ? row[header].toFixed(2) :
        row[header] ? `"${row[header]}"` : ''
      ).join(','))
    ].join('\n');
  };

  // Download CSV file
  const downloadCSV = (data: Transaction[]) => {
    const csvContent = generateCSVContent(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transformed_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Send transformed data to server API endpoint
  const uploadToServer = async (data: Transaction[]) => {
    try {
      console.log("\n\nThe lenght of data in uploadtoserver: ", data.length);
      setIsSubmittingToServer(true);

      const validatedData = data.map(transaction => ({
        ...transaction,
        date: transaction.date // now it's just a string in 'DD-MM-YYYY'
      }));

      // const CHUNK_SIZE = 100;
      let totalUploaded = 0;

      // for (let i = 0; i < validatedData.length; i += CHUNK_SIZE) {
        // const chunk = validatedData.slice(i, i + CHUNK_SIZE);

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: validatedData,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Upload failed');
        }

        totalUploaded += responseData.count || 0;
      // }

      toast.success(`Uploaded ${totalUploaded} transactions`);
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingToServer(false);
    }
  };



  // Handle form submission
    const handleSubmit = () => {
    if (!allRequiredFieldsMapped) {
      toast.error('Please map all required fields before submitting');
      return;
    }

    setIsLoading(true);
    try {
      const data = transformData();
      setTransformedData(data);
      console.log("\nTHE SLICED TRANSACTION DATA: ", transformedData.length)
      setStorageChoicePrompt(true); // Show prompt after successful transform
      toast.success(`Transformed ${data.length} records (skipped ${skippedRows.length})`);
    } catch (error) {
      toast.error(`Error transforming data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Transaction CSV Importer: {csvData.length > 0 ? `${csvData.length} Records` : 'No File Selected'}
        </h1>
      </div>

      {/* File Upload Section */}
      <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <File className="h-5 w-5 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {file ? file.name : 'Select CSV File'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Type Configuration Section (Always Visible) */}
      {headers.length > 0 && (
        <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Transaction Type Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={hasTypeColumn === true}
                  onChange={() => setHasTypeColumn(true)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Single column with type (credit/debit)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={hasTypeColumn === false}
                  onChange={() => setHasTypeColumn(false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Separate columns for income/expense</span>
              </label>
            </div>

            {/* Income/Expense Column Mapping */}
            {hasTypeColumn === false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Income/Credit Column</label>
                  <select
                    value={incomeColumn}
                    onChange={(e) => setIncomeColumn(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
                  >
                    <option value="">Select column</option>
                    {headers.map(header => (
                      <option key={`income-${header}`} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expense/Debit Column</label>
                  <select
                    value={expenseColumn}
                    onChange={(e) => setExpenseColumn(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
                  >
                    <option value="">Select column</option>
                    {headers.map(header => (
                      <option key={`expense-${header}`} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Mapping Section */}
      {headers.length > 0 && hasTypeColumn !== null && (
        <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Map CSV Columns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date (required) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <select
                value={columnMapping.date}
                onChange={(e) => handleColumnMapping('date', e.target.value)}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
              >
                <option value="">Select date column</option>
                {headers.map(header => (
                  <option key={`date-${header}`} value={header}>{header}</option>
                ))}
              </select>
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <select
                value={columnMapping.description}
                onChange={(e) => handleColumnMapping('description', e.target.value)}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
              >
                <option value="">Select description column</option>
                {headers.map(header => (
                  <option key={`desc-${header}`} value={header}>{header}</option>
                ))}
              </select>
            </div>

            {/* Type and Amount or Income/Expense columns */}
            {hasTypeColumn ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.type}
                    onChange={(e) => handleColumnMapping('type', e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
                  >
                    <option value="">Select type column</option>
                    {headers.map(header => (
                      <option key={`type-${header}`} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.amount}
                    onChange={(e) => handleColumnMapping('amount', e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
                  >
                    <option value="">Select amount column</option>
                    {headers.map(header => (
                      <option key={`amount-${header}`} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {/* Additional Data */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Additional Data</label>
              <select
                value={columnMapping.additionalData}
                onChange={(e) => {
                  console.log(`Selected additional data column: ${e.target.value}`);
                  handleColumnMapping('additionalData', e.target.value)}}
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700"
              >
                <option value="">Select column for additional data</option>
                {headers.map(header => (
                  <option key={`additional-${header}`} value={header}>{header}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This will store any extra data from the CSV
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {previewData.length > 0 && (
        <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">CSV Preview</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {headers.slice(0, 5).map(header => (
                    <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {headers.slice(0, 5).map(header => (
                      <td key={`${i}-${header}`} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {row[header]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {transformedData.length > 0 && (
          <>
            <button
              onClick={() => downloadCSV(transformedData)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={() => {
                console.log('Keeping data for further processing');
                console.log('Data', transformedData);

              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Keep Data
            </button>
          </>
        )}
        
        {headers.length > 0 && hasTypeColumn !== null && (
          <button
            onClick={handleSubmit}
            disabled={!allRequiredFieldsMapped || isLoading}
            className={`px-4 py-2 rounded-md text-white ${
              !allRequiredFieldsMapped || isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'Transform Data'
            )}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {skippedRows.length > 0 && (
        <div className="text-yellow-600 dark:text-yellow-400">
          Note: Skipped {skippedRows.length} rows with missing/invalid data
        </div>
      )}
      
      {showDownloadPrompt && transformedData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Download Transformed Data</h3>
            <p className="mb-4">
              Your data has been successfully transformed. Would you like to download it as a CSV file?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDownloadPrompt(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  downloadCSV(transformedData);
                  setShowDownloadPrompt(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt user to choose storage destination */}
      {storageChoicePrompt && transformedData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Where do you want to store the data?</h3>
            <p className="mb-4">You can save the data locally or send it to the server.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('transformedTransactions', JSON.stringify(transformedData));
                  setStorageChoicePrompt(false);
                  toast.success('Data saved to local storage.');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Save Locally
              </button>
              <button
                onClick={() => {
                  uploadToServer(transformedData);
                  setStorageChoicePrompt(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isSubmittingToServer}
              >
                {isSubmittingToServer ? 'Uploading...' : 'Upload to Server'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper component for cards
function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}