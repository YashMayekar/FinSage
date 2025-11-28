'use client';
import HandleData from '@/components/HandleData';
import TransactionTable from '@/components/TransactionTable';
import useTransactions from '@/hooks/useTransactions';
import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';


export default function Transactions() {
  const { transactions } = useTransactions();
  const [showUpload, setShowUpload] = React.useState(false);
  const [Menu, setMenu] = React.useState(true);
  const [CnfDelete, setCnfDelete] = React.useState(false);
  useEffect(() => {
    if (transactions.length > 0) {
      setMenu(true);
    }
  }, []);

  function DeleteTransactions () {
    localStorage.removeItem('transactionAnalysis:v2');
    localStorage.removeItem('transformedTransactions');
    localStorage.removeItem('latest_insights');
    window.location.reload();
  }

  return (
    <div className="rounded-lg shadow p-3 gap-10">
      
      
      {Menu && transactions.length > 0 && <div className='mt-5 mb-5 ml-auto mr-auto max-w-fit border p-10 rounded gap-5 flex flex-col jusify-center self-center'>
        <div>
          <h1 className="text-xl text-center mb-2">Upload new transactions or Delete the existing transactions ?</h1>
        </div>
        <button
          onClick={() => {
            setShowUpload(true);
            setMenu(false);
          }}
          className="border border-blue-600 hover:text-blue-400 hover:cursor-pointer hover:font-bold text-blue-500  py-2 px-4 rounded"
        >
          Upload  Transactions
        </button>
        <button
          onClick={() => setCnfDelete(true)}
          className="border border-pink-600 hover:text-pink-400 hover:cursor-pointer hover:font-bold text-pink-500 py-2 px-4 rounded"
        >
          Delete All Transactions
        </button>
      </div>}

      {CnfDelete && 
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)] bg-opacity-50">
      <div className='mt-5 mb-3 text-white bg-[var(--background)] ml-auto mr-auto max-w-fit border p-5 rounded gap-3 flex flex-col jusify-center self-center'>
          <h1 className="text-lg text-[var(--foreground)] mb-2">Are you sure you want to delete all transactions ?</h1>
          <div className='flex flex-row justify-evenly text-[var(--foreground)]'>
            <button className='px-10 py-2 border hover:cursor-pointer'
              onClick={DeleteTransactions}
            >Yes</button>
            <button className='px-10 py-2 border hover:cursor-pointer'
              onClick={() => {
                setMenu(true)
                setShowUpload(false)
                setCnfDelete(false)
              }}
            >No</button> </div>
        </div>
        </div>  
      }

      {showUpload && <>
      <button className='ml-5 text-center border px-4 py-1 hover:cursor-pointer' 
       onClick={() => {
        setMenu(true)
        setShowUpload(false)
       }}
      ><div className='flex flex-row'><ChevronLeft/>Back</div></button>
      <HandleData />
      </>}

      { 
      transactions.length === 0 && 
        <div className='ml-auto mr-auto flex flex-col max-w-100% justify-center '>
          <h1 className="text-2xl font-bold mb-5">No Transactions Found</h1>
          <div className='mb-5'>Please upload your transaction data to get started.
          <HandleData/>    
          </div>
          </div>
      }
      {/* TransactionTable component to display transactions */}
      { (transactions.length > 0) && <div className='flex flex-col'>
        <h1 className="ml-5 text-2xl mt-10 font-bold">Your Transactions:</h1>
        <TransactionTable />
      </div>}
      {/* Example usage of Input and Button */}
    </div>
  );
}
