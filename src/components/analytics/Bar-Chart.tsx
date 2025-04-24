"use client"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEY } from "../TransactionClassifier"
import { useTransactions } from "@/hooks/useTransactions"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useState, useEffect, useMemo } from 'react'
import { getRecommendedDataSource } from "@/lib/dataSourceChecker"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface Transaction {
  id: string | number;
  date: string;
  amount: number;
  type: string;
  description?: string | null;
}

interface MonthlyData {
  month: string;
  [type: string]: number | string;
  total: number;
}

type DataSource = "local" | "api";

export default function MonthlyStackedBarChart() {
  // Local storage transactions
  const dataSource = getRecommendedDataSource(12); // 12 hour freshness window

  // Local storage transactions
  const [localTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEY, []);
  
  // API transactions with proper memoization
  const { transactions: apiTransactions, isLoading, error } = useTransactions()
  const memoizedApiTransactions = useMemo(() => apiTransactions || [], [apiTransactions]);
  
  // Determine which transactions to use
  const transactions = dataSource === "local" ? localTransactions : memoizedApiTransactions;
  
  const [chartData, setChartData] = useState<MonthlyData[]>([])

  // Process transaction data to group by month and type
  useEffect(() => {
    if (!transactions || transactions.length === 0 || !transactions[0]?.date) {
      setChartData([]);
      return;
    }

    // Get all unique types safely
    const types = Array.from(new Set(
      transactions
        .map((tx: any) => tx?.type)
        .filter(Boolean) as string[]
    ));
    
    // Group by month and type
    const monthlyData: Record<string, MonthlyData> = {};

    transactions.forEach((tx: any) => {
      if (!tx?.date) return;
      
      try {
        const date = new Date(tx.date);
        if (isNaN(date.getTime())) return;
        
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { month: monthYear, total: 0 };
          // Initialize all types to 0
          types.forEach(type => {
            monthlyData[monthYear][type] = 0;
          });
        }
        
        // Add absolute amount to the corresponding type
        const amount = Math.abs(Number(tx.amount) || 0);
        monthlyData[monthYear][tx.type] = (Number(monthlyData[monthYear][tx.type]) || 0) + amount;
        monthlyData[monthYear].total += amount;
      } catch (e) {
        console.error('Error processing transaction:', tx, e);
      }
    });

    // Convert to array and sort by month
    const sortedData = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month));

    setChartData(sortedData);
  }, [transactions]);

  if (isLoading && dataSource === "api") {
    return <div className="p-4 text-center">Loading transactions...</div>;
  }

  if (error && dataSource === "api") {
    return <div className="p-4 text-center text-red-500">Error loading data</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="p-4 text-center">
        No transaction data available from {dataSource === "local" ? "local storage" : "API"}
      </div>
    );
  }

  // Get unique types safely
  const types = chartData.length > 0 
    ? Object.keys(chartData[0]).filter(key => key !== 'month' && key !== 'total')
    : [];

  return (
    <div className="bg-black rounded-xl shadow p-6 w-full">
      <h2 className="text-xl font-semibold mb-4">
        Monthly Transaction Summary ({dataSource === "local" ? "Local Data" : "API Data"})
      </h2>
      <p className="text-gray-400 text-sm mb-4">
        Stacked by transaction type with monthly totals
      </p>
      
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
            <XAxis 
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: 'white' }}
              tickFormatter={(value: string) => {
                const [year, month] = value.split('-');
                const date = new Date(Number(year), Number(month)-1);
                return `${date.toLocaleString('default', { month: 'short' })} ${year}`;
              }}
            />
            <YAxis 
              tick={{ fill: 'white' }}
              tickFormatter={(value: number) => `₹${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                borderRadius: '8px',
                backgroundColor: '#1F2937',
                color: '#FFFFFF'
              }}
              formatter={(value: number, name: string) => [
                `₹${value.toLocaleString()}`,
                name === 'total' ? 'Total' : name
              ]}
              labelFormatter={(label: string) => {
                const [year, month] = label.split('-');
                const date = new Date(Number(year), Number(month)-1);
                return `${date.toLocaleString('default', { month: 'long' })} ${year}`;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => (
                <span className="text-white text-sm">
                  {value}
                </span>
              )}
            />
            
            {types.map((type, index) => (
              <Bar 
                key={`${type}-${index}`}
                dataKey={type}
                stackId="a"
                fill={COLORS[index % COLORS.length]}
                name={type}
              />
            ))}
            
            <Bar 
              dataKey="total"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              name="Total"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}