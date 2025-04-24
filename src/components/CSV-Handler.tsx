'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parse } from 'papaparse';
import { Upload, File, X, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { uploadTransactionsToDatabase } from '@/lib/uploadTransactions'; // Adjust path as needed



export default function CSVImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    description: '',
    amount: '',
    type: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);

  const requiredFields = ['date', 'description', 'amount'];

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
          setPreviewData(data.slice(0, 5));
          setUploadComplete(false);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleColumnMapping = (field: string, value: string) => {
    const updatedMapping = {
      ...columnMapping,
      [field]: value,
    };
    setColumnMapping(updatedMapping);
  };

  const allRequiredFieldsMapped = useMemo(() => {
    return requiredFields.every((field) => columnMapping[field]);
  }, [columnMapping]);

  const handleSubmit = async () => {
    if (!allRequiredFieldsMapped) {
      toast.error('Please map all required fields before submitting');
      return;
    }
  
    setIsLoading(true);
    try {
      const result = await uploadTransactionsToDatabase(csvData, columnMapping);
  
      if (!result.success) {
        throw new Error(result.message);
      }
  
      toast.success(result.message);
      setUploadComplete(true);
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex-row gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-row gap-3">
          <Upload className="h-6 w-6 self-center text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl self-center font-bold text-gray-800 dark:text-white">
            Import Transactions
          </h1>

          {/* File Upload Section */}
          
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <File className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Select CSV File'}
                </span>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            
              <button
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => {
                  setFile(null);
                  setCsvData([]);
                  setHeaders([]);
                  setPreviewData([]);
                  setUploadComplete(false);
                }}
              >
                <X className="h-4 w-4" />
                Clear
              </button>
          
          </div>
        </div>
        
          

        {/* Column Mapping Section */}
        {headers.length > 0 && !uploadComplete && (
          <div className="mb-8 mt-5">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
              Map CSV Columns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(columnMapping).map(([field, mappedValue]) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {field}
                    {requiredFields.includes(field) && (
                      <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                    )}
                  </label>
                  <select
                    value={mappedValue}
                    onChange={(e) => handleColumnMapping(field, e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-white"
                  >
                    <option value="" className="text-gray-400">
                      Select {field} column
                    </option>
                    {headers.map((header) => (
                      <option
                        key={header}
                        value={header}
                        className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Preview Section */}
        {previewData.length > 0 && !uploadComplete && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
              Preview
            </h2>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {requiredFields.concat('type').map((field) => (
                      <th key={field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {columnMapping.date ? format(new Date(row[columnMapping.date]), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {columnMapping.description ? row[columnMapping.description] : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {columnMapping.amount ? parseFloat(row[columnMapping.amount]).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {columnMapping.type ? row[columnMapping.type] : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {headers.length > 0 && !uploadComplete && (
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!allRequiredFieldsMapped || isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                !allRequiredFieldsMapped || isLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
              } transition-colors`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Upload Transactions
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Success Message */}
        {uploadComplete && (
          <div className="text-green-600 dark:text-green-400 font-medium text-center mt-6">
            ✅ Transactions uploaded successfully!
          </div>
        )}
      </div>
    </div>
  );
}
