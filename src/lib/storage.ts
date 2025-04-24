// lib/storage.ts
type ClassifiedTransaction = {
    id: string | number;
    date: string;
    amount: number;
    description: string | null;
    type: 'income' | 'expense';
    status: 'completed' | 'failed';
  };
  
  const STORAGE_KEY = 'classifiedTransactionsData';
  
  export const getStoredTransactions = (): ClassifiedTransaction[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading transactions from localStorage:', error);
      return [];
    }
  };
  
  export const storeTransactions = (transactions: ClassifiedTransaction[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error storing transactions:', error);
    }
  };