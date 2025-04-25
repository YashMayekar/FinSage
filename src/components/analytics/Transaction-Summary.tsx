interface Transaction {
    id: string | number;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    description: string | null;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeCategories: Record<string, number>;
  expenseCategories: Record<string, number>;
  largestIncome: Transaction | null;
  largestExpense: Transaction | null;
  frequentTransactions: {
    description: string;
    count: number;
    totalAmount: number;
  }[];
  monthlyTrends: Record<string, {
    income: number;
    expenses: number;
    net: number;
  }>;
  transactionCount: number;
  validTransactionCount: number;
}

export const processTransactionData = (transactions: Transaction[] | null | undefined): TransactionSummary => {
  // Initialize default summary for empty/null cases
  const defaultSummary: TransactionSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    incomeCategories: {},
    expenseCategories: {},
    largestIncome: null,
    largestExpense: null,
    frequentTransactions: [],
    monthlyTrends: {},
    transactionCount: 0,
    validTransactionCount: 0
  };

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return defaultSummary;
  }

  const summary: TransactionSummary = {
    ...defaultSummary,
    transactionCount: transactions.length
  };

  // Helper function to safely parse date
  const getMonthYear = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown Date';
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : 
             date.toLocaleString('default', { month: 'short', year: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  // Process each transaction with null checks
  transactions.forEach(transaction => {
    if (!transaction || typeof transaction !== 'object') {
      return; // Skip invalid transaction objects
    }

    // Safely extract properties with defaults
    const type = transaction.type === 'income' || transaction.type === 'expense' 
      ? transaction.type 
      : null;
    const amount = Math.abs(Number(transaction.amount)) || 0;
    const description = transaction.description?.trim() || 'Uncategorized';
    const date = transaction.date;
    const monthYear = getMonthYear(date);

    // Count valid transactions (those with amount and type)
    if (amount > 0 && type) {
      summary.validTransactionCount++;
    } else {
      return; // Skip invalid transactions
    }

    // Initialize month in trends if not exists
    if (!summary.monthlyTrends[monthYear]) {
      summary.monthlyTrends[monthYear] = { income: 0, expenses: 0, net: 0 };
    }

    if (type === 'income') {
      summary.totalIncome += amount;
      summary.monthlyTrends[monthYear].income += amount;
      summary.monthlyTrends[monthYear].net += amount;

      // Track income categories
      summary.incomeCategories[description] = (summary.incomeCategories[description] || 0) + amount;

      // Track largest income
      if (!summary.largestIncome || amount > (summary.largestIncome.amount || 0)) {
        summary.largestIncome = { ...transaction, amount };
      }
    } else if (type === 'expense') {
      summary.totalExpenses += amount;
      summary.monthlyTrends[monthYear].expenses += amount;
      summary.monthlyTrends[monthYear].net -= amount;

      // Track expense categories
      summary.expenseCategories[description] = (summary.expenseCategories[description] || 0) + amount;

      // Track largest expense
      if (!summary.largestExpense || amount > (summary.largestExpense.amount || 0)) {
        summary.largestExpense = { ...transaction, amount };
      }
    }

    // Track frequent transactions
    const existingFrequent = summary.frequentTransactions.find(t => t.description === description);
    if (existingFrequent) {
      existingFrequent.count++;
      existingFrequent.totalAmount += amount;
    } else {
      summary.frequentTransactions.push({
        description,
        count: 1,
        totalAmount: amount
      });
    }
  });

  // Calculate net balance
  summary.netBalance = summary.totalIncome - summary.totalExpenses;

  // Sort frequent transactions by count
  summary.frequentTransactions.sort((a, b) => b.count - a.count);

  return summary;
};