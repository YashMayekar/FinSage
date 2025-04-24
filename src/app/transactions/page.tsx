'use client';

import { useEffect, useState } from 'react';
import CSVImport from "@/components/CSV-Handler";
import { Input } from '@/components/ui/input';
import { ArrowUpDown } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useTransactions';

export default function Transactions() {
  // const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('description');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  // const [isLoading, setIsLoading] = useState(true);
  // const [hasError, setHasError] = useState(false);


  const { transactions, isLoading, error, mutate} = useTransactions();

  // const fetchTransactions = () => {
  //   setIsLoading(true);
  //   setHasError(false);
  //   fetch('/api/transactions')
  //     .then(res => {
  //       if (!res.ok) throw new Error('Fetch failed');
  //       return res.json();
  //     })
  //     .then(data => {
  //       if (Array.isArray(data)) {
  //         setTransactions(data);
  //       } else {
  //         throw new Error('Invalid data format');
  //       }
  //     })
  //     .catch(err => {
  //       console.error('Failed to fetch transactions', err);
  //       setHasError(true);
  //     })
  //     .finally(() => setIsLoading(false));
  // };

  // useEffect(() => {
  //   fetchTransactions();
  // }, []);

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!sortConfig) return 0;
    const valueA = a[sortConfig.key];
    const valueB = b[sortConfig.key];
    return sortConfig.direction === 'asc'
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  });

  const filteredTransactions = sortedTransactions.filter(tx => {
    const value = tx[searchColumn];
    if (searchColumn === 'date') {
      const formattedDate = new Date(value).toLocaleDateString().toLowerCase();
      return formattedDate.includes(searchTerm.toLowerCase());
    }
    return (value ?? '').toString().toLowerCase().includes(searchTerm.toLowerCase());
  });
  

  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = filteredTransactions.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTransactions.length / entriesPerPage);

  const toggleSort = (key: string) => {
    if (sortConfig?.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col gap-10">
      <CSVImport />

      {isLoading && <p className="text-white text-2xl glowing-text">Fetching transactions...</p>}

      {error && (
        <div className="text-red-600 space-y-2">
          <p>Failed to fetch transactions.</p>
          <Button onClick={mutate}>Fetch Again</Button>
        </div>
      )}

      {!isLoading && !error && transactions.length > 0 && (
        <>
          <div className="flex items-center gap-4">
            <Input
              type="text"
              placeholder={`Search by ${searchColumn}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <select
              className=" bg-black p-2 rounded"
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
            >
              <option value="description">Description</option>
              <option value="type">Type</option>
              <option value="amount">Amount</option>
              <option value="date">Date</option>
            </select>
            <select
              className=" p-2 bg-black ml-auto rounded"
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <table className="w-full border mt-4 text-left">
            <thead>
              <tr>
                {['date', 'description', 'type', 'amount'].map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer px-4 py-2 border"
                    onClick={() => toggleSort(col)}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                    {sortConfig?.key === col && (
                      <ArrowUpDown className="inline ml-1 w-4 h-4" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentEntries.map((tx, index) => (
                <tr key={index} className="border">
                  <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{tx.description}</td>
                  <td className="px-4 py-2 capitalize">{tx.type}</td>
                  <td className="px-4 py-2">₹{tx.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-center mt-4">
            <div className="space-x-2">
              <Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>{'<<'}</Button>
              <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>{'<'}</Button>
              <span className="mx-2">Page {currentPage} of {totalPages}</span>
              <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>{'>'}</Button>
              <Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>{'>>'}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
