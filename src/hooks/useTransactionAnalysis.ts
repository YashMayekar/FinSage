'use client';

import * as React from 'react';
import { parse } from 'date-fns';
import { toast } from 'react-hot-toast';
import useTransactions from '@/hooks/useTransactions';

export type Txn = {
  date: string;             // stored as "DD-MM-YYYY"
  description: string | null;
  type: 'income' | 'expense';
  amount: number;
  additionalData: string | null;
};

type AnalyzedTxn = Txn & {
  category?: string;
  cleanedDescription?: string;
};

type RangeMode = '7d' | '14d' | '21d' | '30d' | '90d' | '180d' | '1y' | 'max' | 'custom';

export type AnalysisOptions = {
  mode?: RangeMode;
  start?: string;
  end?: string;
  data?: (Txn | AnalyzedTxn)[]; // Allow passing pre-analyzed data
};

// Data point types
type DailyPoint   = { date: string; income: number; expense: number; savings: number };
type MonthlyPoint = { monthKey: string; label: string; income: number; expense: number; savings: number };
type WeekdayPoint = { weekday: string; income: number; expense: number };
type DataPoint    = { label: string; income: number; expense: number; savings: number };

type SourceItem   = { label: string; total: number; count: number };
type LargestItem  = { date: string; description: string; amount: number; category?: string };

type RecurringItem = {
  label: string;
  count: number;
  total: number;
  avgAmount: number;
  firstDate: string;
  lastDate: string;
  type: 'income' | 'expense' | 'mixed';
  category?: string;
};

type SpikeItem = { date: string; expense: number; z: number };

type CategoryAnalysis = {
  income: Record<string, { total: number; count: number }>;
  expense: Record<string, { total: number; count: number }>;
};

export type TransactionAnalysis = {
  version: 2;
  generatedAt: string;
  range: { mode: RangeMode; start?: string; end?: string };
  summary: {
    incomeTotal: number;
    expenseTotal: number;
    netSavings: number;
    savingsRate: number | null;
    burnRateMonthly: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
    volatilityExpense: number;
    runwayDays: number | null;
    bestMonth?: { label: string; savings: number };
    worstMonth?: { label: string; savings: number };
  };
  series: {
    daily: DailyPoint[];
    monthly: MonthlyPoint[];
    weekday: WeekdayPoint[];
    dataPoints: DataPoint[];
  };
  topSources: {
    income: SourceItem[];
    expense: SourceItem[];
  };
  largest: {
    income: LargestItem[];
    expense: LargestItem[];
  };
  recurring: RecurringItem[];
  spikes: SpikeItem[];
  categories: CategoryAnalysis;
};

const LS_KEY = 'transactionAnalysis:v2';

/**
 * Convert "DD-MM-YYYY" string → ISO-like string ("YYYY-MM-DD")
 * ✅ Safe against timezone shifts (does NOT use .toISOString()).
 */
const toISO = (ddmmyyyy: string) => {
  const d = parse(ddmmyyyy, 'dd-MM-yyyy', new Date());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Format YYYY-MM-DD → "Mar 2025"
 */
const monthLabel = (isoDate: string) => {
  const d = new Date(isoDate);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

// --- Small utilities ---
const clamp2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum    = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const mean   = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);
const stdev  = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
};

const normalizeLabel = (s: string | null) =>
  (s || 'Unknown').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);

/**
 * Try to extract "balance: <number>" from additionalData
 */
const parseBalanceFromAdditional = (rows: (Txn | AnalyzedTxn)[]) => {
  for (let i = rows.length - 1; i >= 0; i--) {
    const ad = rows[i].additionalData || '';
    const m = ad.match(/balance\s*[:=]?\s*([0-9,.\s]+)/i);
    if (m && m[1]) {
      const amt = parseFloat(m[1].replace(/,/g, '').trim());
      if (!isNaN(amt)) return amt;
    }
  }
  return null;
};

/**
 * Apply range (7d, 30d, custom, etc.) to transactions
 */
const applyRange = (dates: string[], opts: Required<AnalysisOptions>) => {
  if (!dates.length) return null;

  // End date = max of input dates OR custom end
  const end = opts.mode === "custom" && opts.end
    ? new Date(opts.end)
    : new Date(Math.max(...dates.map(s => +new Date(s))));

  let start: Date;

  if (opts.mode === "custom" && opts.start) {
    start = new Date(opts.start);
  } else {
    const modeDays: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "21d": 21,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "1y": 365,
    };

    if (opts.mode === "max") {
      start = new Date(Math.min(...dates.map(s => +new Date(s))));
    } else {
      const days = modeDays[opts.mode] ?? 30;
      start = new Date(end);
      start.setDate(end.getDate() - days + 1); // include end date
    }
  }

  return { start, end };
};

/**
 * Build bucketed datapoints (weekly, monthly, etc.)
 */
function buildDataPoints(mode: RangeMode, start: Date, end: Date, daily: DailyPoint[]): DataPoint[] {
  const dayCount = Math.max(1, Math.round((+end - +start) / (1000 * 60 * 60 * 24)) + 1);

  let bucketSize = 1;
  let bucketCount = 7;

  if (mode === '7d') {
    bucketSize = 1; bucketCount = 7;
  } else {
    if (dayCount <= 14) { bucketSize = 2; bucketCount = 7; }
    else if (dayCount <= 21) { bucketSize = 3; bucketCount = 7; }
    else if (dayCount <= 30) { bucketSize = 3; bucketCount = 10; }
    else if (dayCount <= 90) { bucketSize = 10; bucketCount = 9; }
    else if (dayCount <= 180) { bucketSize = 20; bucketCount = 9; }
    else if (dayCount <= 366) {
      // Monthly aggregation
      const byMonth: Record<string, { i: number; e: number }> = {};
      daily.forEach(d => {
        const key = d.date.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { i: 0, e: 0 };
        byMonth[key].i += d.income;
        byMonth[key].e += d.expense;
      });
      return Object.entries(byMonth).map(([k, v]) => ({
        label: monthLabel(k),
        income: clamp2(v.i),
        expense: clamp2(v.e),
        savings: clamp2(v.i - v.e),
      }));
    } else {
      bucketCount = 12;
      bucketSize = Math.ceil(dayCount / bucketCount);
    }
  }

  const buckets: DataPoint[] = [];
  for (let i = 0; i < bucketCount ; i++) {
    const bStart = new Date(start);
    bStart.setDate(start.getDate() + i * bucketSize);
    const bEnd = new Date(bStart);
    bEnd.setDate(bStart.getDate() + bucketSize - 1);

    const inBucket = daily.filter(d => {
      const dd = new Date(d.date);
      return dd >= bStart && dd <= bEnd;
    });

    const income = sum(inBucket.map(d => d.income));
    const expense = sum(inBucket.map(d => d.expense));

    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    buckets.push({
      label: `${fmt(bStart)} – ${fmt(bEnd)}`,
      income: clamp2(income),
      expense: clamp2(expense),
      savings: clamp2(income - expense),
    });
  }

  return buckets;
}

export function useTransactionAnalysis(options: AnalysisOptions = {}) {
  const { transactions: hookTransactions, isLoading: txLoading, error } = useTransactions();
  
  // Use provided data if available, otherwise use hook data
  const providedData = options.data;
  const transactions = providedData || hookTransactions;

  const opts = React.useMemo<Required<AnalysisOptions>>(() => ({
    mode: options.mode ?? '90d',
    start: options.start ?? '',
    end: options.end ?? '',
    data: options.data ?? [],
  }), [options.mode, options.start, options.end, options.data]);

  const [analysis, setAnalysis] = React.useState<TransactionAnalysis | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [InRangeTransactions, setInRangeTransactions] = React.useState<(Txn | AnalyzedTxn)[]>([]);

  const compute = React.useCallback(() => {
    if (!transactions || transactions.length === 0) {
      setAnalysis(null);
      return;
    }

    setBusy(true);
    try {
      // Normalize transactions and filter out invalid ones
      const normalized: (Txn | AnalyzedTxn)[] = transactions
        .map((t: Txn | AnalyzedTxn) => ({ 
          ...t, 
          date: t.date, 
          amount: +t.amount 
        }))
        .filter((t: Txn | AnalyzedTxn) => t.date && !isNaN(t.amount));

      const isoDates = normalized.map(t => toISO(t.date));
      const range = applyRange(isoDates, opts);
      
      if (!range) {
        setAnalysis(null);
        setBusy(false);
        return;
      }
      
      const { start, end } = range;

      // Filter transactions within date range
      const inRange = normalized.filter(t => {
        const iso = toISO(t.date);
        const d = new Date(iso);
        return d >= start && d <= end;
      });
      
      setInRangeTransactions(inRange);

      if (inRange.length === 0) {
        const payload: TransactionAnalysis = {
          version: 2,
          generatedAt: new Date().toISOString(),
          range: { mode: opts.mode, start: opts.start, end: opts.end },
          summary: {
            incomeTotal: 0, expenseTotal: 0, netSavings: 0,
            savingsRate: null, burnRateMonthly: 0,
            avgMonthlyIncome: 0, avgMonthlyExpense: 0,
            volatilityExpense: 0, runwayDays: null
          },
          series: { daily: [], monthly: [], weekday: [], dataPoints: [] },
          topSources: { income: [], expense: [] },
          largest: { income: [], expense: [] },
          recurring: [],
          spikes: [],
          categories: { income: {}, expense: {} },
        };
        setAnalysis(payload);
        try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
        setBusy(false);
        return;
      }

      // Daily map
      const dailyMap: Record<string, { income: number; expense: number }> = {};
      inRange.forEach(t => {
        const iso = toISO(t.date);
        if (!dailyMap[iso]) dailyMap[iso] = { income: 0, expense: 0 };
        dailyMap[iso][t.type] += t.amount;
      });

      const allDailyKeys = Object.keys(dailyMap).sort();
      const daily: DailyPoint[] = allDailyKeys.map(d => {
        const { income, expense } = dailyMap[d];
        return { date: d, income: clamp2(income), expense: clamp2(expense), savings: clamp2(income - expense) };
      });

      // Monthly series
      const monthlyMap: Record<string, { income: number; expense: number }> = {};
      allDailyKeys.forEach(dk => {
        const mk = dk.slice(0, 7);
        if (!monthlyMap[mk]) monthlyMap[mk] = { income: 0, expense: 0 };
        monthlyMap[mk].income += dailyMap[dk].income;
        monthlyMap[mk].expense += dailyMap[dk].expense;
      });

      const monthly: MonthlyPoint[] = Object.keys(monthlyMap).sort().map(mk => {
        const i = monthlyMap[mk].income;
        const e = monthlyMap[mk].expense;
        const s = i - e;
        return {
          monthKey: mk,
          label: monthLabel(mk + '-01'),
          income: clamp2(i),
          expense: clamp2(e),
          savings: clamp2(s),
        };
      });

      // Top sources - use cleanedDescription if available
      const incomeBuckets: Record<string, { total: number; count: number }> = {};
      const expenseBuckets: Record<string, { total: number; count: number }> = {};
      
      // Category analysis
      const categoryAnalysis: CategoryAnalysis = {
        income: {},
        expense: {}
      };

      inRange.forEach(t => {
        // Use cleanedDescription if available, otherwise use description
        const label = 'cleanedDescription' in t && t.cleanedDescription 
          ? normalizeLabel(t.cleanedDescription)
          : normalizeLabel(t.description);
        
        // Category analysis
        if ('category' in t && t.category) {
          const category = t.category.trim();
          const type = t.type;
          if (!categoryAnalysis[type][category]) {
            categoryAnalysis[type][category] = { total: 0, count: 0 };
          }
          categoryAnalysis[type][category].total += t.amount;
          categoryAnalysis[type][category].count += 1;
        }

        // Top sources analysis
        if (t.type === 'income') {
          if (!incomeBuckets[label]) incomeBuckets[label] = { total: 0, count: 0 };
          incomeBuckets[label].total += t.amount;
          incomeBuckets[label].count += 1;
        } else {
          if (!expenseBuckets[label]) expenseBuckets[label] = { total: 0, count: 0 };
          expenseBuckets[label].total += t.amount;
          expenseBuckets[label].count += 1;
        }
      });

      const topIncome: SourceItem[] = Object.entries(incomeBuckets)
        .map(([label, v]) => ({ label, total: clamp2(v.total), count: v.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const topExpense: SourceItem[] = Object.entries(expenseBuckets)
        .map(([label, v]) => ({ label, total: clamp2(v.total), count: v.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Largest transactions - include category if available
      const largestIncome = inRange
        .filter(t => t.type === 'income')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(t => ({ 
          date: toISO(t.date), 
          description: ('cleanedDescription' in t && t.cleanedDescription) || t.description || 'Unknown', 
          amount: clamp2(t.amount),
          category: 'category' in t ? t.category : undefined
        }));

      const largestExpense = inRange
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(t => ({ 
          date: toISO(t.date), 
          description: ('cleanedDescription' in t && t.cleanedDescription) || t.description || 'Unknown', 
          amount: clamp2(t.amount),
          category: 'category' in t ? t.category : undefined
        }));

      // Weekday analysis
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekdayAgg: Record<number, { income: number; expense: number }> = { 
        0: {income:0,expense:0}, 1: {income:0,expense:0}, 2: {income:0,expense:0}, 
        3: {income:0,expense:0}, 4: {income:0,expense:0}, 5: {income:0,expense:0}, 
        6: {income:0,expense:0} 
      };
      
      inRange.forEach(t => {
        const d = new Date(toISO(t.date));
        const w = d.getDay();
        weekdayAgg[w][t.type] += t.amount;
      });

      const weekday: WeekdayPoint[] = [0,1,2,3,4,5,6].map(w => ({
        weekday: weekdayNames[w],
        income: clamp2(weekdayAgg[w].income),
        expense: clamp2(weekdayAgg[w].expense),
      }));

      // Recurring items
      const recurringMap: Record<string, RecurringItem> = {};
      inRange.forEach(t => {
        const label = 'cleanedDescription' in t && t.cleanedDescription 
          ? normalizeLabel(t.cleanedDescription)
          : normalizeLabel(t.description);
        
        if (!recurringMap[label]) {
          recurringMap[label] = {
            label,
            count: 0,
            total: 0,
            avgAmount: 0,
            firstDate: t.date,
            lastDate: t.date,
            type: t.type,
            category: 'category' in t ? t.category : undefined
          };
        }
        
        recurringMap[label].count += 1;
        recurringMap[label].total += t.amount;
        recurringMap[label].avgAmount = recurringMap[label].total / recurringMap[label].count;
        if (t.date < recurringMap[label].firstDate) recurringMap[label].firstDate = t.date;
        if (t.date > recurringMap[label].lastDate) recurringMap[label].lastDate = t.date;
      });

      const recurring = Object.values(recurringMap)
        .filter(r => r.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Expense spikes
      const expenseDaily = daily.map(d => d.expense);
      const avgExpense = mean(expenseDaily);
      const stdExpense = stdev(expenseDaily);
      const spikes: SpikeItem[] = daily
        .map(d => {
          const z = stdExpense > 0 ? (d.expense - avgExpense) / stdExpense : 0;
          return { date: d.date, expense: d.expense, z };
        })
        .filter(d => d.z > 2)
        .sort((a, b) => b.z - a.z)
        .slice(0, 5);

      // Summary
      const incomeTotal = sum(daily.map(d => d.income));
      const expenseTotal = sum(daily.map(d => d.expense));
      const netSavings = incomeTotal - expenseTotal;
      const savingsRate = incomeTotal > 0 ? netSavings / incomeTotal : null;

      const burnRateMonthly = expenseTotal * (30 / daily.length);
      const avgMonthlyIncome = incomeTotal * (30 / daily.length);
      const avgMonthlyExpense = expenseTotal * (30 / daily.length);
      const volatilityExpense = stdExpense;

      const latestBalance = parseBalanceFromAdditional(inRange);
      const runwayDays = latestBalance !== null && expenseTotal > 0 
        ? clamp2(latestBalance / (expenseTotal / daily.length)) 
        : null;

      const bestMonth = monthly.length ? monthly.reduce((a, b) => a.savings > b.savings ? a : b) : undefined;
      const worstMonth = monthly.length ? monthly.reduce((a, b) => a.savings < b.savings ? a : b) : undefined;

      const dataPoints = buildDataPoints(opts.mode, start, end, daily);

      const payload: TransactionAnalysis = {
        version: 2,
        generatedAt: new Date().toISOString(),
        range: { mode: opts.mode, start: opts.start, end: opts.end },
        summary: {
          incomeTotal: clamp2(incomeTotal),
          expenseTotal: clamp2(expenseTotal),
          netSavings: clamp2(netSavings),
          savingsRate: savingsRate !== null ? clamp2(savingsRate) : null,
          burnRateMonthly: clamp2(burnRateMonthly),
          avgMonthlyIncome: clamp2(avgMonthlyIncome),
          avgMonthlyExpense: clamp2(avgMonthlyExpense),
          volatilityExpense: clamp2(volatilityExpense),
          runwayDays,
          bestMonth: bestMonth ? { label: bestMonth.label, savings: bestMonth.savings } : undefined,
          worstMonth: worstMonth ? { label: worstMonth.label, savings: worstMonth.savings } : undefined,
        },
        series: {
          daily,
          monthly,
          weekday,
          dataPoints,
        },
        topSources: {
          income: topIncome,
          expense: topExpense,
        },
        largest: {
          income: largestIncome,
          expense: largestExpense,
        },
        recurring,
        spikes,
        categories: categoryAnalysis,
      };

      setAnalysis(payload);
      try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
    } catch (err) {
      console.error("Error computing analysis:", err);
      toast.error("Failed to compute analysis");
    } finally {
      setBusy(false);
    }
  }, [transactions, opts]);

  React.useEffect(() => {
    compute();
  }, [compute]);

  return {
    analysis,
    isloading: busy || (txLoading && !providedData),
    error: providedData ? null : error,
    refresh: compute,
    InRangeTransactions,
  };
}
  
export default useTransactionAnalysis;