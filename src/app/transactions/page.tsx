'use client';
import HandleData from '@/components/HandleData';
import RefreshTransactionsButton from '@/components/RefreshTransactionButton';
import TransactionTable from '@/components/TransactionTable';
import { forwardRef, InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default function Transactions() {

  return (
    <div className="rounded-lg shadow p-3 gap-4">
      {/* HandleData component to handle data input */}
      <HandleData />
      Transactions
      {/*Button for refreshing Transactions from the database */}
      <RefreshTransactionsButton  className='flex justify-end'/>
      {/* TransactionTable component to display transactions */}
      <TransactionTable />
    </div>
  );
}

