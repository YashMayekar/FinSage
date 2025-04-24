"use client"

import { useState, useMemo } from "react"
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface TransactionData {
  type: string;
  data: {
    date: string;
    amount: number;
  }[];
}

interface ChartProps {
  generatedData: TransactionData[];
}

const DEFAULT_COLORS = [
  "#6366F1", // indigo
  "#EF4444", // red
  "#22C55E", // green
  "#F59E0B", // amber
  "#3B82F6", // blue
  // ... other colors
];

const getColorForType = (type: string, index: number) => {
  const typeColorMap: Record<string, string> = {
    Dr: "#EF4444",
    Cr: "#22C55E",
  };
  return typeColorMap[type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

const AreaChartComponent = ({ generatedData }: ChartProps) => {
  const [timeRange, setTimeRange] = useState("90d");

  // Calculate filtered data and totals
  const { filteredData, typeTotals } = useMemo(() => {
    if (!generatedData || generatedData.length === 0) {
      return { filteredData: [], typeTotals: {} };
    }

    // Get all unique dates
    const allDates = Array.from(
      new Set(generatedData.flatMap(typeData => typeData.data.map(item => item.date)))
    );

    const referenceDate = new Date(Math.max(...allDates.map(date => new Date(date).getTime())));
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    if (timeRange === "7d") daysToSubtract = 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Calculate totals for each type
    const totals: Record<string, number> = {};
    generatedData.forEach(typeData => {
      totals[typeData.type] = typeData.data
        .filter(item => new Date(item.date) >= startDate)
        .reduce((sum, item) => sum + item.amount, 0);
    });

    // Filter data for the chart
    const chartData = allDates
      .filter(date => new Date(date) >= startDate)
      .map(date => {
        const entry: any = { date };
        generatedData.forEach(typeData => {
          const transaction = typeData.data.find(item => item.date === date);
          entry[typeData.type] = transaction ? transaction.amount : 0;
        });
        return entry;
      });

    return { filteredData: chartData, typeTotals: totals };
  }, [generatedData, timeRange]);

  if (!generatedData || generatedData.length === 0) {
    return <div className="bg-black rounded-xl shadow p-6 w-full">Loading data...</div>;
  }

  return (
    <div className="bg-black rounded-xl shadow p-6 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Transaction Overview</h2>
          <p className="text-white text-sm">
            Showing transaction amounts by type for selected period
          </p>
        </div>
        <select
          className="border bg-black rounded-lg px-3 py-2 mt-2 sm:mt-0"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="90d">Last 3 months</option>
          <option value="30d">Last 30 days</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>

      {/* Display totals for each type */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(typeTotals).map(([type, total], index) => (
          <div 
            key={type} 
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${getColorForType(type, index)}20`, borderLeft: `4px solid ${getColorForType(type, index)}` }}
          >
            <div className="text-sm font-medium" style={{ color: getColorForType(type, index) }}>
              {type}
            </div>
            <div className="text-white font-bold">
              {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              {generatedData.map((typeData, index) => (
                <linearGradient
                  key={`fill-${typeData.type}`}
                  id={`fill-${typeData.type}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={getColorForType(typeData.type, index)} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={getColorForType(typeData.type, index)} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="2" />
            <XAxis
              dataKey="date"
              tickMargin={10}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', backgroundColor: '#1F2937', color: '#FFFFFF' }}
              labelFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            {generatedData.map((typeData, index) => (
              <Area
                key={typeData.type}
                type="natural"
                dataKey={typeData.type}
                stroke={getColorForType(typeData.type, index)}
                fill={`url(#fill-${typeData.type})`}
                stackId="1"
                name={typeData.type}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AreaChartComponent;