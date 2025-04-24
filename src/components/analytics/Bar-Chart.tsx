"use client"

import { useTransactions } from "@/hooks/useTransactions"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useState, useEffect } from 'react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface Transaction {
  amount: number;
  date: string;
  type: string;
  [key: string]: any;
}

interface MonthlyData {
  month: string;
  [type: string]: number | string;
  total: number;
}

export default function MonthlyStackedBarChart() {
  const { transactions, isLoading, error, mutate } = useTransactions();
  const [chartData, setChartData] = useState<MonthlyData[]>([])

  // Process transaction data to group by month and type
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;

    // First get all unique types
    const types = Array.from(new Set(transactions.map((tx: any) => tx.type)));
    
    // Group by month and type
    const monthlyData: Record<string, MonthlyData> = {};

    transactions.forEach((tx: Transaction) => {
      const date = new Date(tx.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { month: monthYear, total: 0 };
        // Initialize all types to 0
        types.forEach((type: any) => {
          monthlyData[monthYear][type] = 0;
        });
      }
      
      // Add amount to the corresponding type
      const amount = Math.abs(tx.amount);
      monthlyData[monthYear][tx.type] = (monthlyData[monthYear][tx.type] as number) + amount;
      monthlyData[monthYear].total += amount;
    });

    // Convert to array and sort by month
    const sortedData = Object.values(monthlyData)
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    setChartData(sortedData);
  }, [transactions]);

  if (isLoading) return <div className="p-4 text-center">Loading transactions...</div>;
  if (error){ 
      mutate(); // Retry fetching data
     return <div className="p-4 text-center text-red-500">Error loading data</div>;
  }
  if (chartData.length === 0) return <div className="p-4 text-center">No transaction data available</div>;

  // Get unique types from the first data point (all should have same types)
  const types = chartData.length > 0 
    ? Object.keys(chartData[0]).filter(key => key !== 'month' && key !== 'total')
    : [];

  return (
    <div className="bg-black rounded-xl shadow p-6 w-full">
      <h2 className="text-xl font-semibold mb-4">Monthly Transaction Summary</h2>
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
                const date = new Date(`${year}-${month}-01`);
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
                const date = new Date(`${year}-${month}-01`);
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
                key={type}
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