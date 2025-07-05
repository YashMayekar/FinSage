"use client";
import React, { useMemo, useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';

interface Transaction {
  id?: string;
  date: string;
  description: string | null;
  type: string;
  amount: number;
  additionalData: string | null;
  [key: string]: any;
}

type SortConfig = {
  key: keyof Transaction | null;
  direction: 'asc' | 'desc';
};

export default function TransactionTable() {
  const { transactions, isLoading, error } = useTransactions();

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'All'>(10);

  const handleSort = (key: keyof Transaction) => {
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

  const columns: Array<keyof Transaction> = [
    'date',
    'description',
    'type',
    'amount',
    'additionalData',
  ];

  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  if (isLoading) return <p>Loading...</p>;
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
            className="bg-[var(--background)] border border-[var(--border)] px-2 py-1 text-sm ; "
          >
            <option value={10} className='border border-[var(--border)]'>10</option>
            <option value={50} className='border border-[var(--border)]'>50</option>
            <option value={100} className='border border-[var(--border)]'>100</option>
            <option value="All" className='border border-[var(--border)]'>All</option>
          </select>
        </div>

        {rowsPerPage !== 'All' && (
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}>{'<<'}</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>{'<'}</button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>{'>'}</button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>{'>>'}</button>
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
                className="px-3 py-2 border border-[var(--border)] cursor-pointer text-left"
              >
                {col}{' '}
                {sortConfig.key === col
                  ? sortConfig.direction === 'asc'
                    ? '▲'
                    : '▼'
                  : ''}
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
                  onChange={e => handleFilterChange(col.toString(), e.target.value)}
                  className="w-full px-2 py-1 border border-[var(--border)] rounded text-xs"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((tx: Transaction, i: number) => (
            <tr key={tx.id || i} className="border-b border-[var(--border)]">
              {columns.map(col => (
                <td key={col} className="px-3 py-2 border-b border-[var(--border)]">
                  {col === 'amount'
                    ? `₹${parseFloat(String(tx[col])).toFixed(2)}`
                    : tx[col] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
