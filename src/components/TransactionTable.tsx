"use client";
import React, { useMemo, useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { Txn } from '@/hooks/useTransactionAnalysis';

interface Transaction {
  id?: string;
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: unknown;
}

type SortConfig = {
  key: string | null;
  direction: 'asc' | 'desc';
};

interface TransactionTableProps {
  transactions?: Txn[]; // Add optional transactions prop
}

export default function TransactionTable({ transactions: propTransactions }: TransactionTableProps) {
  const { transactions: hookTransactions, isLoading, error } = useTransactions();
  
  // Use propTransactions if provided, otherwise use hookTransactions
  const transactions = propTransactions || hookTransactions;

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(5);

  // Dynamically get all columns from the transactions
  const columns = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Get all unique keys from all transactions
    const allKeys = new Set<string>();
    transactions.forEach(tx => {
      Object.keys(tx).forEach(key => {
        allKeys.add(key);
      });
    });
    
    return Array.from(allKeys);
  }, [transactions]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // reset to first page on filter change
  };

  const filteredData = useMemo(() => {
    return transactions.filter((tx: Transaction) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const fieldValue = String(tx[key] ?? '').toLowerCase();
        return fieldValue.includes(value.toLowerCase());
      })
    );
  }, [transactions, filters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortConfig]);

  const totalRows = sortedData.length;
  const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(totalRows / rowsPerPage);

  const paginatedData = useMemo(() => {
    if (rowsPerPage === 'All') return sortedData;
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const formatValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (typeof value === 'number') {
      // Check if it's a currency field (amount, price, etc.)
      const currencyFields = ['amount', 'price', 'value', 'total', 'balance'];
      if (currencyFields.includes(key.toLowerCase())) {
        return `₹${value.toFixed(2)}`;
      }
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  if (isLoading && !propTransactions) return <p>Loading...</p>;
  if (error && transactions.length === 0) return <p>Error loading transactions.</p>;
  if (transactions.length === 0) return <p>No transactions found.</p>;

  return (
    <div className="overflow-x-auto text-sm p-5">
      <div className="flex justify-between items-center mb-2">
        <div>
          <label className="mr-2">Rows per page:</label>
          <select
            value={rowsPerPage}
            onChange={e => {
              const value = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
              setRowsPerPage(value);
              setCurrentPage(1);
            }}
            className="bg-[var(--background)] border border-[var(--border)] px-2 py-1 text-sm"
          >
            <option value={5} className='border border-[var(--border)]'>5</option>
            <option value={10} className='border border-[var(--border)]'>10</option>
            <option value={25} className='border border-[var(--border)]'>25</option>
            <option value={50} className='border border-[var(--border)]'>50</option>
            <option value={100} className='border border-[var(--border)]'>100</option>
            <option value="All" className='border border-[var(--border)]'>All</option>
          </select>
        </div>

        {rowsPerPage !== 'All' && (
          <div className="flex items-center gap-2">
            <button className='rounded-lg py-1 px-2 border border-[var(--border)] cursor-pointer' onClick={() => goToPage(1)} disabled={currentPage === 1}>{'<<'}</button>
            <button className='rounded-lg py-1 px-2 border border-[var(--border)] cursor-pointer' onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>{'<'}</button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button className='rounded-lg py-1 px-2 border border-[var(--border)] cursor-pointer' onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>{'>'}</button>
            <button className='rounded-lg py-1 px-2 border border-[var(--border)] cursor-pointer' onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>{'>>'}</button>
          </div>
        )}
      </div>

      <table className="min-w-full border border-[var(--border)]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="px-3 py-2 border border-[var(--border)] cursor-pointer text-left hover:bg-[var(--border)]"
              >
                <div className="flex items-center">
                  <span className="font-medium">{col}</span>
                  {sortConfig.key === col && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            {columns.map(col => (
              <th key={col} className="px-3 py-1 border border-[var(--border)]">
                <input
                  type="text"
                  placeholder={`Filter ${col}`}
                  value={filters[col] || ''}
                  onChange={e => handleFilterChange(col, e.target.value)}
                  className="w-full px-2 py-1 border border-[var(--border)] rounded text-xs"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((tx: Transaction, i: number) => (
            <tr key={tx.id || i} className="border-b border-[var(--border)] hover:bg-[var(--border)]">
              {columns.map(col => (
                <td key={col} className="px-3 py-2 border-b border-[var(--border)]">
                  {formatValue(col, tx[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}