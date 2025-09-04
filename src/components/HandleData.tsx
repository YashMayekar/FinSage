import { useState, useMemo, useRef } from 'react';
import { parse } from 'papaparse';
import { File, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Transaction {
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: string | number | null | undefined;
}

interface TypeMapping {
  [key: string]: 'income' | 'expense';
}

export default function HandleData() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    description: '',
    type: '',
    amount: '',
    additionalData: ''
  });
  const [incomeColumn, setIncomeColumn] = useState<string>('');
  const [expenseColumn, setExpenseColumn] = useState<string>('');
  const [hasTypeColumn, setHasTypeColumn] = useState<boolean | null>(null);
  const [uniqueTypeValues, setUniqueTypeValues] = useState<string[]>([]);
  const [typeValueMapping, setTypeValueMapping] = useState<TypeMapping>({});
  const [showTypeMappingModal, setShowTypeMappingModal] = useState(false);
  const [skippedRows, setSkippedRows] = useState<number[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [isloading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);

    parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        if (data.length > 0) {
          setCsvData(data);
          setHeaders(Object.keys(data[0]));
          setHasTypeColumn(null);
          setSkippedRows([]);
        }
      },
      error: (error) => toast.error(`CSV parse error: ${error.message}`),
    });
  };

  // Handle column selection
  const handleColumnMapping = (field: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }));
  };

  // Detect unique type values
  const handleTypeMappingDetection = () => {
    if (hasTypeColumn && columnMapping.type && csvData.length > 0) {
      const typeColumn = columnMapping.type;
      const uniqueValues = Array.from(
        new Set(csvData.map(row => String(row[typeColumn] || '').trim().toLowerCase()))
      ).filter(Boolean);

      setUniqueTypeValues(uniqueValues);

      // Auto mapping common values
      // const autoMappings: TypeMapping = {};
      // uniqueValues.forEach(value => {
      //   console.log("The unique value : ", value);
      //   if (['credit', 'income', 'deposit', 'in', 'cr', '+'].includes(value)) autoMappings[value] = 'income';
      //   else if (['debit', 'expense', 'withdrawal', 'out', 'db', '-'].includes(value)) autoMappings[value] = 'expense';
      // });

      // setTypeValueMapping(autoMappings);
    }
  };

  // Clear everything
  const handleClear = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({ date: '', description: '', type: '', amount: '', additionalData: '' });
    setIncomeColumn('');
    setExpenseColumn('');
    setHasTypeColumn(null);
    setUniqueTypeValues([]);
    setTypeValueMapping({});
    setSkippedRows([]);
    setProgress(0);
    setShowTypeMappingModal(false);
    setIsLoading(false);
  };

  // Format date as DD-MM-YYYY
  const formatDate = (input: string) => {
    try {
      if (!input) return '';
      const date = new Date(input);
      if (isNaN(date.getTime())) return input;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
    } catch {
      return input;
    }
  };

  // Check if all required fields are mapped
  const allRequiredFieldsMapped = useMemo(() => {
  if (hasTypeColumn) {
    // ✅ Check if every unique value has been mapped
    const typeMapped =
      uniqueTypeValues.length > 0 &&
      uniqueTypeValues.every((v) =>
        ["income", "expense"].includes(typeValueMapping[v] ?? "")
      );

    return (
      ["date", "type", "amount"].every((f) => columnMapping[f]) && typeMapped
    );
  } else {
    // ✅ For separate income/expense columns, at least one must be selected
    return Boolean(columnMapping.date) && Boolean(incomeColumn || expenseColumn);
  }
}, [
  columnMapping,
  hasTypeColumn,
  incomeColumn,
  expenseColumn,
  uniqueTypeValues,
  typeValueMapping,
]);


// Transform CSV to Transaction[]
const transformData = async () => {
  const skipped: number[] = [];
  const total = csvData.length;
  const transformed: Transaction[] = [];

  if (total === 0) {
    setProgress(0);
    setSkippedRows([]);
    return [];
  }

  setProgress(0);

  for (let i = 0; i < total; i++) {
    const row = csvData[i];
    console.log("Processing row:", progress, i, total);

    try {
      // Validation
      // -------do not effect or modify this part from here------- //
      const hasDate = Boolean(columnMapping.date) && Boolean(row[columnMapping.date]);
      // console.log("\nDate check: ", hasDate, columnMapping.date, row[columnMapping.date]);
      let isValid = false;

      if (hasTypeColumn) {
        isValid =
          Boolean(columnMapping.type) &&
          Boolean(columnMapping.amount) &&
          Boolean(row[columnMapping.type]) &&
          Boolean(row[columnMapping.amount]);
        // console.log("Type column check: ", isValid, columnMapping.type, " = ",row[columnMapping.type], ' ; ', columnMapping.amount, " = ", row[columnMapping.amount]);
      } else {
        isValid =
          (Boolean(incomeColumn) && Boolean(row[incomeColumn])) ||
          (Boolean(expenseColumn) && Boolean(row[expenseColumn]));
        // console.log("No type column check: ", isValid, incomeColumn, " = ",row[incomeColumn], ' ; ', expenseColumn, " = ", row[expenseColumn]);
      }

      if (!hasDate || !isValid) {
        skipped.push(i);
        continue;
      }
      // Build transaction object
      const newRow: Partial<Transaction> = {
        // Date logic
        // date: formatDate(row[columnMapping.date]),
        date: row[columnMapping.date],
        
        // Description & Additional Data logic
        description: columnMapping.description
          ? String(row[columnMapping.description]).substring(0, 255)
          : null,
        additionalData: null,
      };

      // Additional data logic
      if (columnMapping.additionalData) {
        newRow.additionalData = `${columnMapping.additionalData}: ${
          row[columnMapping.additionalData] ?? ""
        }`;
      }

      // Type & Amount logic
      if (hasTypeColumn) {
        const rawType = String(row[columnMapping.type]).trim().toLowerCase();
        newRow.type = typeValueMapping[rawType];
        newRow.amount =
          parseFloat(String(row[columnMapping.amount]).replace(/,/g, "")) || 0;
      } else {
        const income = incomeColumn
          ? parseFloat(String(row[incomeColumn]).replace(/,/g, "")) || 0
          : 0;
        const expense = expenseColumn
          ? parseFloat(String(row[expenseColumn]).replace(/,/g, "")) || 0
          : 0;
        if (income > 0) {
          newRow.type = "income";
          newRow.amount = income;
        } else {
          newRow.type = "expense";
          newRow.amount = expense;
        }
      }

      transformed.push(newRow as Transaction);
      // -------do not effect or modify this part till here------- //
    } catch {
      skipped.push(i);
    }

    // ✅ update progress incrementally
    const progressValue = Math.round(((i + 1) / total) * 100);
    if (progressValue % 5 === 0 || i === total - 1) {
      setProgress(progressValue);
      await new Promise((resolve) => setTimeout(resolve, 0)); // allow UI update
    }
  }

  setSkippedRows(skipped);
  return transformed;
};

// Handle submit
const handleSubmit = async () => {
  if (!allRequiredFieldsMapped) {
    toast.error("Please map all required fields before submitting.");
    return;
  }

  if (hasTypeColumn && Object.keys(typeValueMapping).length === 0) {
    toast.error("Please map all required fields before submitting.");
    return;
  }

  setIsLoading(true);
  setProgress(0);

  try {
    const data = await transformData(); // now async

    try {
      localStorage.setItem(
        "transformedTransactions",
        JSON.stringify(data)
      );
      toast.success("Transactions saved locally.");
    } catch {
      toast.error("Failed to save locally.");
    }

    toast.success(
      `Processed ${data.length} rows. Skipped ${skippedRows.length}.`
    );
  } catch {
    toast.error("Error transforming data.");
  } finally {
    setProgress(100);
    setIsLoading(false);
  }
};

  // Detect type values when column changes

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          CSV Importer: {csvData.length > 0 ? `${csvData.length} Records` : 'No File Selected'}
        </h1>
      </div>

      {/* File Upload */}
      <div className="card p-4 rounded-lg shadow border flex items-center gap-4">
        <label className="flex-1 cursor-pointer">
          <div className="flex items-center gap-2 px-4 py-2 border rounded-md">
            <File className="h-5 w-5 text-blue-500" />
            {file ? file.name : 'Select CSV File'}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={handleClear} className="flex items-center gap-1 px-3 py-2 border rounded-md">
          <X className="h-4 w-4" /> Clear
        </button>
      </div>

      {/* Type Column Choice */}
      {headers.length > 0 && (
        <div className="card p-4 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-3">Transaction Type Configuration</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={hasTypeColumn === true} onChange={() => setHasTypeColumn(true)} />
              Single column with type (credit/debit)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={hasTypeColumn === false} onChange={() => setHasTypeColumn(false)} />
              Separate columns for income/expense
            </label>
          </div>

          {hasTypeColumn === false && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label>Income Column</label>
                <select value={incomeColumn} onChange={(e) => setIncomeColumn(e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                  <option value="">Select column</option>
                  {headers.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label>Expense Column</label>
                <select value={expenseColumn} onChange={(e) => setExpenseColumn(e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                  <option value="">Select column</option>
                  {headers.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Mapping */}
      {headers.length > 0 && hasTypeColumn !== null && (
        <div className="card p-4 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Map CSV Columns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>Date *</label>
              <select value={columnMapping.date} onChange={(e) => handleColumnMapping('date', e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                <option value="">Select column</option>
                {headers.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label>Description</label>
              <select value={columnMapping.description} onChange={(e) => handleColumnMapping('description', e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                <option value="">Select column</option>
                {headers.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            {hasTypeColumn && (
              <>
                <div>
                  <label>Type Column *</label>
                  <select value={columnMapping.type} onChange={(e) => handleColumnMapping('type', e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                    <option value="">Select column</option>
                    {headers.map(h => <option key={h}>{h}</option>)}
                  </select>
                  {uniqueTypeValues.length > 0 && <p>{uniqueTypeValues.length} unique values detected.</p>}
                </div>
                <div>
                  <label>Amount *</label>
                  <select value={columnMapping.amount} onChange={(e) => handleColumnMapping('amount', e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                    <option value="">Select column</option>
                    {headers.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                
                
                {/* -------------------------------- */}
                <div className="relative w-full">
                  <label >Select Income and Expense values</label>
                  {/* Trigger */}
                  <div
                    onClick={() =>{ 
                      setShowTypeMappingModal((prev) => !prev)
                      handleTypeMappingDetection();
                    }}
                    className="w-full border rounded p-2 bg-[var(--background)] cursor-pointer"
                  >
                    {Object.keys(typeValueMapping).length > 0
                      ? "Mapped values selected"
                      : "Click to map values"}
                  </div>

                  {/* Attached card dropdown */}
                  {showTypeMappingModal && (
                    <div className="absolute left-0 mt-1 w-full bg-[var(--background)] border rounded shadow-lg p-4 z-50 max-h-64 overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-2">Map Transaction Types</h3>
                      <div className="space-y-3">
                        {uniqueTypeValues.map((value) => (
                          <div key={value} className="flex items-center justify-between">
                            <span className="capitalize">{value}</span>
                            <div className="flex gap-2">
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`type-${value}`}
                                  checked={typeValueMapping[value] === "income"}
                                  onChange={() =>
                                    setTypeValueMapping((prev) => ({
                                      ...prev,
                                      [value]: "income",
                                    }))
                                  }
                                />
                                Income
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`type-${value}`}
                                  checked={typeValueMapping[value] === "expense"}
                                  onChange={() =>
                                    setTypeValueMapping((prev) => ({
                                      ...prev,
                                      [value]: "expense",
                                    }))
                                  }
                                />
                                Expense
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={() => setShowTypeMappingModal(false)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </>
            )}
            
            <div className={hasTypeColumn ? '' : 'md:col-span-2'}>
              <label>Additional Data</label>
              <select value={columnMapping.additionalData} onChange={(e) => handleColumnMapping('additionalData', e.target.value)} className="w-full border rounded p-2 bg-[var(--background)]">
                <option value="">Select column</option>
                {headers.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isloading && 
        <div className="w-full bg-gray-200 rounded h-4 mt-2">
          <div className="bg-blue-600 h-4 rounded transition-all" style={{ width: `${progress}%` }} />
          
        </div>
      }

      {/* Submit Section */}
      {headers.length > 0 && hasTypeColumn !== null && (
        <div className="flex flex-row justify-between  gap-2">

          {/* Progress Info */}
          {(isloading || progress === 100) && (
            <p className="text-lg text-gray-400">
              {progress === 100
                ? `Completed: ${csvData.length} out of ${csvData.length} transactions processed.`
                : `${Math.round((progress / 100) * csvData.length)} out of ${csvData.length} transactions processed.`}
            </p>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!allRequiredFieldsMapped || isloading}
            className={`ml-auto px-4 py-2 rounded-md text-white ${
              !allRequiredFieldsMapped || isloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isloading ? 'Processing...' : (progress === 100 ? 'All Transactions Stored!' :'Store Transactions')}
          </button>


        </div>
      )}
      {/* Skipped Rows Info */}
      {skippedRows.length > 0 && (
        <p className="text-red-600">
          Skipped {skippedRows.length} invalid rows.
        </p>
      )}

    </div>
  );
}
