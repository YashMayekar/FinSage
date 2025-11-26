'use client';
import HandleData from '@/components/HandleData';
import RefreshTransactionsButton from '@/components/RefreshTransactionButton';
import TransactionTable from '@/components/TransactionTable';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function Transactions() {
  return (
    <div className="rounded-lg shadow p-3 gap-4">
      {/* HandleData component to handle data input */}
      <HandleData />
      Transactions
      {/* Button for refreshing Transactions from the database */}
      <RefreshTransactionsButton className='flex justify-end'/>
      {/* TransactionTable component to display transactions */}
      <TransactionTable />
      {/* Example usage of Input and Button */}
    </div>
  );
}
