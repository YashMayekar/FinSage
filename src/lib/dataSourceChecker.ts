// utils/dataSourceChecker.ts
import { STORAGE_KEY } from "@/components/TransactionClassifier";

interface Transaction {
  id: string | number;
  date: string;
  amount: number;
  type: string;
  [key: string]: any;
}

// Main function to check data source with freshness
export function getRecommendedDataSource(freshnessHours = 24): 'local' | 'api' {
  if (typeof window === 'undefined') return 'api';

  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const lastUpdated = localStorage.getItem(`${STORAGE_KEY}_lastUpdated`);
    
    // Check if data exists and is valid
    if (storedData) {
      const transactions: Transaction[] = JSON.parse(storedData);
      
      const hasValidData = Array.isArray(transactions) && 
        transactions.length > 0 &&
        transactions.every(tx => 
          tx?.id !== undefined &&
          tx?.date && 
          typeof tx.amount === 'number' &&
          tx?.type
        );

      if (!hasValidData) return 'api';

      // Check freshness if valid data exists
      if (lastUpdated) {
        const lastUpdatedDate = new Date(lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate <= freshnessHours ? 'local' : 'api';
      }
      
      return 'local'; // Valid data but no timestamp - use it anyway
    }
    
    return 'api';
  } catch (error) {
    console.error('Error checking data source:', error);
    return 'api';
  }
}

// Helper function to update the freshness timestamp
export function updateLocalDataTimestamp(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEY}_lastUpdated`, new Date().toISOString());
  }
}

// Pure existence check without freshness consideration
export function hasLocalData(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return false;
    
    const transactions: Transaction[] = JSON.parse(storedData);
    return Array.isArray(transactions) && transactions.length > 0;
  } catch {
    return false;
  }
}

// Freshness check only (assumes data exists)
export function isLocalDataFresh(freshnessHours = 24): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastUpdated = localStorage.getItem(`${STORAGE_KEY}_lastUpdated`);
  if (!lastUpdated) return false;
  
  try {
    const lastUpdatedDate = new Date(lastUpdated);
    const hoursSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate <= freshnessHours;
  } catch {
    return false;
  }
}