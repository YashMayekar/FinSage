'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
// import TopContributorsCharts from '@/analytics/PieChart';
const COLORS = {
  income: '#22C55E',
  expense: '#EF4444',
  savings: '#3B82F6',
  toottip: '#1F2937',
};
const currency = (n: number | null | undefined) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    : '—';

const PieColors = [
  "#6366F1", // Indigo
  "#22C55E", // Green
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
];





export default function Dashboard() {
    const [mode, setMode] = React.useState< '7d' | '14d' | '21d' | '30d' | '90d' | '180d' | '1y' | 'max' | 'custom'  >('90d');
    const [start, setStart] = React.useState('');
    const [end, setEnd] = React.useState('');
    const { analysis, isloading, refresh } = useTransactionAnalysis({ mode, start, end });
    
    const headingRange = React.useMemo(() => {
        if (mode === '7d') return 'Last 1 week';
        if (mode === '14d') return 'Last 2 weeks';
        if (mode === '21d') return 'Last 3 weeks';
        if (mode === '30d') return 'Last 1 month';
        if (mode === '90d') return 'Last 3 months';
        if (mode === '180d') return 'Last 6 months';
        if (mode === '1y') return 'Last 1 year';
        if (mode === 'max') return 'Max Data Range';
        if (mode === 'custom') return start && end ? `${start} → ${end}` : 'Custom';
        return '';
    }, [mode, start, end]);
    
    console.log("TEST\nRendering useTransactionAnalysis\n", { analysis });

    type DataPoint = { label: string; income?: number; expense?: number };
    type WaterfallEntry = { label: string; base: number; value: number; type: "income" | "expense" };

    function buildWaterfallData(data: DataPoint[]): WaterfallEntry[] {
    let cumulative = 0;
    const result: WaterfallEntry[] = [];

    data.forEach((d) => {
        if (d.income) {
        // Income bar goes UP from current cumulative
        result.push({
            label: `${d.label} (Income)`,
            base: cumulative,
            value: d.income,
            type: "income",
        });
        cumulative += d.income;
        }
        if (d.expense) {
        // Expense bar goes DOWN from top of last income
        result.push({
            label: `${d.label} (Expense)`,
            base: cumulative,
            value: -d.expense, // negative to go downward
            type: "expense",
        });
        cumulative -= d.expense;
        }
    });

    return result;
    }

    const waterfallData = React.useMemo(() => buildWaterfallData(analysis?.series.dataPoints || []), [analysis]);

    return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Profile Analysis</h1>
          <p className="text-sm opacity-70">Insights generated from your transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-[var(--foreground)] bg-[var(--background)] border rounded-lg px-3 py-2 hover:ring-1 hover:cursor-pointer transition"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <optgroup label="Weekly">
              <option value="7d">Last 1 week</option>
              <option value="14d">Last 2 weeks</option>
              <option value="21d">Last 3 weeks</option>
            </optgroup>
            <optgroup label="Monthly">
              <option value="30d">Last 1 month</option>
              <option value="90d">Last 3 months</option>
              <option value="180d">Last 6 months</option>
            </optgroup>
            <optgroup label="Yearly">
              <option value="1y">Last 1 year</option>
              <option value="max">Max Date Range</option>

            </optgroup>
            <optgroup label="Custom">   
            <option value="custom">Select Range</option>
            </optgroup>
          
          </select>
          {mode === 'custom' && (
            <>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </>
          )}
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-lg border hover:ring-1 hover:cursor-pointer transition"
          >
            Recompute
          </button>
        </div>
      </div>

      {/* Loading / Empty */}
      {isloading && <div className="p-4 rounded-xl border">Computing analysis…</div>}
      {!isloading && analysis && (analysis.series.dataPoints?.length === 0) && (
        <div className="p-4 rounded-xl border">No data for the selected range.</div>
      )}
      {!analysis && !isloading && (
        <div className='border p-4 gap-2 rounded-xl flex flex-col justify-center items-center'>
        <h1 className="rounded-xl text-xl font-bold ">Sorry, No transactions found.</h1>
        <h1 className="rounded-xl text-xl font-bold ">Please upload some transactions to see analysis.</h1>
        <a href="/transactions" className='text-yellow-300'>Click here to upload transactions</a>
        </div>
      )}

      {!isloading && analysis && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <StatCard label="Income" value={`₹${currency(analysis.summary.incomeTotal)}`} accent={COLORS.income}/>
            <StatCard label="Expense" value={`₹${currency(analysis.summary.expenseTotal)}`} accent={COLORS.expense}/>
            <StatCard label="Savings" value={`₹${currency(analysis.summary.netSavings)}`} accent={COLORS.savings}/>
            <StatCard label="Savings Rate" value={analysis.summary.savingsRate !== null ? `${(analysis.summary.savingsRate * 100).toFixed(1)}%` : '—'} />
            <StatCard label="Burn Rate (Monthly)" value={`₹${currency(analysis.summary.burnRateMonthly)}`} />
            <StatCard label="Runway" value={analysis.summary.runwayDays !== null ? `${analysis.summary.runwayDays} days` : '—'} />
          </div>

        


{/* Charts Grid */}
<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Left column: Area + Waterfall stacked */}
  <div className="flex flex-col gap-6 lg:col-span-2">
    {/* AreaChart */}
    <section className="rounded-xl border p-4">
      <div className="mb-2">
        <h2 className="font-semibold">Cashflow</h2>
        <p className="text-sm opacity-70">
          Income, Expense & Savings — {headingRange}
        </p>
      </div>
      <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.series.dataPoints}>
                  <defs>
                    <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fill-savings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.savings} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.savings} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="2" />
                  <XAxis dataKey="label" tickMargin={10} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, background: '#ffffffff', color: '#000000ff' }}
                    formatter={(value: any, name: string) => [`₹${currency(value)}`, name]}
                  />
                  <Area type="monotone" dataKey="income" stroke={COLORS.income} fill="url(#fill-income)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke={COLORS.expense} fill="url(#fill-expense)" name="Expense" />
                  <Area type="monotone" dataKey="savings" stroke={COLORS.savings} fill="url(#fill-savings)" name="Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

   {/* Waterfall Chart */}
    <section className="rounded-xl border p-4">
      <div className="mb-2">
        <h2 className="font-semibold">Waterfall</h2>
        <p className="text-sm opacity-70">
          Income vs Expenses — {headingRange}
        </p>
      </div>
      <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData}>
                        <defs>
                        <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.1} />
                        </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="2" />
                        <XAxis dataKey="label" tickMargin={10} />
                        <YAxis />
                        <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.1)" }}
                        contentStyle={{
                            borderRadius: 8,
                            fill:  "url(#fill-tooltip)",
                            background: "#ffffffff",
                            color: "#000000ff",
                        }}
                        formatter={(value: any, name: string, props: any) => [
                            `₹${currency(Math.abs(value))}`,
                            props.payload.type === "income" ? "Income" : "Expense",
                        ]}
                        
                        />

                        {/* Base (invisible) */}
                        <Bar dataKey="base" stackId="a" fill="transparent" />

                        {/* Actual values */}
                        <Bar dataKey="value" stackId="a" barSize={30}>
                        {waterfallData.map((entry, index) => (
                            <Cell
                            key={`cell-${index}`}
                            fill={
                                entry.type === "income"
                                ? "url(#fill-income)"
                                : "url(#fill-expense)"
                            }
                            stroke={entry.type === "income" ? COLORS.income : COLORS.expense}
                            />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>

            </div>
            </section>
    </div>
          
  {/* Right column: Top Contributors (2 pies stacked) */}
  <div className="flex flex-col gap-6">
    <section className="rounded-xl border p-4">
          <div className="">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">
                  Top 5 Transaction Sources in {}
                </h2>
                <span className="text-xs text-[var-foreground]">
                  Based on description grouping
                </span>
              </div>
            </div>
    
            {/* Charts */}
            <div className="grid grid-cols-1 h-[95vh] gap-6 w-full">
              {/* Income Pie */}
              <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var(--background)]">
                <h3 className="text-md font-medium mb-3 text-[var-foreground]">
                  Top Income Sources
                </h3>
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie
                      data={analysis?.topSources?.income || []}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analysis?.topSources?.income.map((_, index) => (
                        <Cell
                          key={`income-${index}`}
                          fill={PieColors[index % PieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        background: "white",
                        color: "black",
                      }}
                      formatter={(val: number) =>
                        `₹${val.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* <CustomLegend data={incomeData} /> */}
              </div>
    
              {/* Expense Pie */}
              <div className="flex flex-col h-auto border p-4 rounded-xl shadow-sm bg-[var(--background)]">
                <h3 className="text-md font-medium mb-3 text-[var-foreground]">
                  Top Expense Categories
                </h3>
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie
                      data={analysis?.topSources?.expense || []}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analysis?.topSources?.expense.map((_, index) => (
                        <Cell
                          key={`expense-${index}`}
                          fill={PieColors[index % PieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      
                      contentStyle={{
                        borderRadius: 8,
                        background: "white",
                        color: "black",
                      }}
                      formatter={(val: number) =>
                        `₹${val.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* <CustomLegend data={expenseData} /> */}
              </div>
            </div>
          </div>
        </section>
    
  </div>
</section>


        {/* BarChart: DataPoints (bucketed by mode) */}
            {/* <section className="rounded-xl border p-4">
            <div className="mb-2">
                <h2 className="font-semibold">Cashflow</h2>
                <p className="text-sm opacity-70">
                Income, Expense & Savings — {headingRange}
                </p>
            </div>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.series.dataPoints}>
                    <defs>
                    <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fill-savings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.savings} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.savings} stopOpacity={0.1} />
                    </linearGradient>
                    </defs>

                    <CartesianGrid vertical={false} strokeDasharray="2" />
                    <XAxis dataKey="label" tickMargin={10} />
                    <Tooltip
                    contentStyle={{
                        borderRadius: 8,
                        background: "#1F2937",
                        color: "#fff",
                    }}
                    formatter={(value: any, name: string) => [
                        `₹${currency(value)}`,
                        name,
                    ]}
                    />

                    <Bar
                    dataKey="income"
                    fill="url(#fill-income)"
                    stroke={COLORS.income}
                    name="Income"
                    barSize={30}
                    />
                    <Bar
                    dataKey="expense"
                    fill="url(#fill-expense)"
                    stroke={COLORS.expense}
                    name="Expense"
                    barSize={30}
                    />
                    <Bar
                    dataKey="savings"
                    fill="url(#fill-savings)"
                    stroke={COLORS.savings}
                    name="Savings"
                    barSize={30}
                    />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </section> */}



                 {/* Monthly best/worst callouts */}
          {(analysis.summary.bestMonth || analysis.summary.worstMonth) && (
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold mb-2">Highlights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.summary.bestMonth && (
                  <div className="rounded-lg border p-3">
                    <div className="text-sm opacity-70">Best Month</div>
                    <div className="font-medium">{analysis.summary.bestMonth.label}</div>
                    <div className="text-green-600 font-semibold">₹{analysis.summary.bestMonth.savings.toLocaleString(undefined, { maximumFractionDigits: 2 })} saved</div>
                  </div>
                )}
                {analysis.summary.worstMonth && (
                  <div className="rounded-lg border p-3">
                    <div className="text-sm opacity-70">Worst Month</div>
                    <div className="font-medium">{analysis.summary.worstMonth.label}</div>
                    <div className="text-red-600 font-semibold">₹{analysis.summary.worstMonth.savings.toLocaleString(undefined, { maximumFractionDigits: 2 })} saved</div>
                  </div>
                )}
              </div>
            </section>
          )}




        
         {/* Lists: Largest & Spikes */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Largest Expenses</h3>
              <ul className="space-y-2">
                {analysis.largest.expense.map((x, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border p-2">
                    <div className="truncate">
                      <div className="font-medium truncate">{x.description}</div>
                      <div className="text-xs opacity-70">{x.date}</div>
                    </div>
                    <div className="font-semibold text-red-600">₹{currency(x.amount)}</div>
                  </li>
                ))}
                {analysis.largest.expense.length === 0 && <div className="opacity-70 text-sm">No items</div>}
              </ul>
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Spike Days (Unusual Spend)</h3>
              <ul className="space-y-2">
                {analysis.spikes.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <div className="font-medium">{new Date(s.date).toLocaleDateString()}</div>
                      <div className="text-xs opacity-70">z-score: {s.z}</div>
                    </div>
                    <div className="font-semibold">₹{currency(s.expense)}</div>
                  </li>
                ))}
                {analysis.spikes.length === 0 && <div className="opacity-70 text-sm">No spikes detected</div>}
              </ul>
            </div>
          </section>

         

        
        </>
      )}
    </div>
  )
} 

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm">{label}</div>
      <div className="text-lg font-semibold" style={{ color: accent }}>{value}</div>
      {accent && (
        <div className="mt-2 h-1 rounded-full" style={{ background: accent, opacity: 0.5 }} />
      )}
    </div>
  );
}






// 'use client';

// import React from 'react';
// import {
//   ResponsiveContainer,
//   AreaChart, Area, XAxis, CartesianGrid, Tooltip,
// } from 'recharts';
// import { useTransactionAnalysis } from '@/hooks/useTransactionAnalysis';
// import WaterfallChart from '@/components/analytics/WaterFallChart';
// import TopContributorsCharts from '@/components/analytics/PieChart';

// const COLORS = {
//   income: '#22C55E',
//   expense: '#EF4444',
//   savings: '#3B82F6',
// };
// const currency = (n: number | null | undefined) =>
//   typeof n === 'number'
//     ? n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
//     : '—';

// export default function AnalysisPage() {
//   const [mode, setMode] = React.useState<
//     '7d' | '14d' | '21d' | '30d' | '90d' | '180d' | '1y' | 'custom'
//   >('90d');
//   const [start, setStart] = React.useState('');
//   const [end, setEnd] = React.useState('');
//   const { analysis, isLoading, refresh } = useTransactionAnalysis({ mode, start, end });

//   const headingRange = React.useMemo(() => {
//     if (mode === '7d') return 'Last 1 week';
//     if (mode === '14d') return 'Last 2 weeks';
//     if (mode === '21d') return 'Last 3 weeks';
//     if (mode === '30d') return 'Last 1 month';
//     if (mode === '90d') return 'Last 3 months';
//     if (mode === '180d') return 'Last 6 months';
//     if (mode === '1y') return 'Last 1 year';
//     if (mode === 'custom') return start && end ? `${start} → ${end}` : 'Custom';
//     return '';
//   }, [mode, start, end]);

//   return (
//     <div className="max-w-7xl mx-auto p-6 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold">Profile Analysis</h1>
//           <p className="text-sm opacity-70">Insights generated from your transactions</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <select
//             className="border rounded-lg px-3 py-2 hover:border-2 hover:cursor-pointer transition"
//             value={mode}
//             onChange={(e) => setMode(e.target.value as any)}
//           >
//             <optgroup label="Weekly">
//               <option value="7d">Last 1 week</option>
//               <option value="14d">Last 2 weeks</option>
//               <option value="21d">Last 3 weeks</option>
//             </optgroup>
//             <optgroup label="Monthly">
//               <option value="30d">Last 1 month</option>
//               <option value="90d">Last 3 months</option>
//               <option value="180d">Last 6 months</option>
//             </optgroup>
//             <optgroup label="Yearly">
//               <option value="1y">Last 1 year</option>
//             </optgroup>
//             <option value="custom">Custom</option>
//           </select>
//           {mode === 'custom' && (
//             <>
//               <input
//                 type="date"
//                 value={start}
//                 onChange={(e) => setStart(e.target.value)}
//                 className="border rounded-lg px-3 py-2"
//               />
//               <input
//                 type="date"
//                 value={end}
//                 onChange={(e) => setEnd(e.target.value)}
//                 className="border rounded-lg px-3 py-2"
//               />
//             </>
//           )}
//           <button
//             onClick={refresh}
//             className="px-3 py-2 rounded-lg border hover:border-2 hover:cursor-pointer transition"
//           >
//             Recompute
//           </button>
//         </div>
//       </div>

//       {/* Loading / Empty */}
//       {isLoading && <div className="p-4 rounded-xl border">Computing analysis…</div>}
//       {!isLoading && (!analysis || analysis.series.dataPoints.length === 0) && (
//         <div className="p-4 rounded-xl border">No data for the selected range.</div>
//       )}

//       {!isLoading && analysis && (
//         <>
//           {/* Stat Cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
//             <StatCard label="Income" value={`₹${currency(analysis.summary.incomeTotal)}`} accent={COLORS.income}/>
//             <StatCard label="Expense" value={`₹${currency(analysis.summary.expenseTotal)}`} accent={COLORS.expense}/>
//             <StatCard label="Savings" value={`₹${currency(analysis.summary.netSavings)}`} accent={COLORS.savings}/>
//             <StatCard label="Savings Rate" value={analysis.summary.savingsRate !== null ? `${(analysis.summary.savingsRate * 100).toFixed(1)}%` : '—'} />
//             <StatCard label="Burn Rate (Monthly)" value={`₹${currency(analysis.summary.burnRateMonthly)}`} />
//             <StatCard label="Runway" value={analysis.summary.runwayDays !== null ? `${analysis.summary.runwayDays} days` : '—'} />
//           </div>

//           {/* AreaChart: DataPoints (bucketed by mode) */}
//           <section className="rounded-xl border p-4">
//             <div className="mb-2">
//               <h2 className="font-semibold">Cashflow</h2>
//               <p className="text-sm opacity-70">Income, Expense & Savings — {headingRange}</p>
//             </div>
//             <div className="h-[300px]">
//               <ResponsiveContainer width="100%" height="100%">
//                 <AreaChart data={analysis.series.dataPoints}>
//                   <defs>
//                     <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.8} />
//                       <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.1} />
//                     </linearGradient>
//                     <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.8} />
//                       <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.1} />
//                     </linearGradient>
//                     <linearGradient id="fill-savings" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor={COLORS.savings} stopOpacity={0.8} />
//                       <stop offset="95%" stopColor={COLORS.savings} stopOpacity={0.1} />
//                     </linearGradient>
//                   </defs>
//                   <CartesianGrid vertical={false} strokeDasharray="2" />
//                   <XAxis dataKey="label" tickMargin={10} />
//                   <Tooltip
//                     contentStyle={{ borderRadius: 8, background: '#1F2937', color: '#fff' }}
//                     formatter={(value: any, name: string) => [`₹${currency(value)}`, name]}
//                   />
//                   <Area type="monotone" dataKey="income" stroke={COLORS.income} fill="url(#fill-income)" name="Income" />
//                   <Area type="monotone" dataKey="expense" stroke={COLORS.expense} fill="url(#fill-expense)" name="Expense" />
//                   <Area type="monotone" dataKey="savings" stroke={COLORS.savings} fill="url(#fill-savings)" name="Savings" />
//                 </AreaChart>
//               </ResponsiveContainer>
//             </div>
//           </section>

//           {/* Top Contributors */}
//           <TopContributorsCharts />

//           {/*  Waterfall */}
//           <WaterfallChart />
        
//          {/* Lists: Largest & Spikes */}
//           <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="rounded-xl border p-4">
//               <h3 className="font-semibold mb-3">Largest Expenses</h3>
//               <ul className="space-y-2">
//                 {analysis.largest.expense.map((x, i) => (
//                   <li key={i} className="flex items-center justify-between rounded-md border p-2">
//                     <div className="truncate">
//                       <div className="font-medium truncate">{x.description}</div>
//                       <div className="text-xs opacity-70">{x.date}</div>
//                     </div>
//                     <div className="font-semibold text-red-600">₹{currency(x.amount)}</div>
//                   </li>
//                 ))}
//                 {analysis.largest.expense.length === 0 && <div className="opacity-70 text-sm">No items</div>}
//               </ul>
//             </div>
//             <div className="rounded-xl border p-4">
//               <h3 className="font-semibold mb-3">Spike Days (Unusual Spend)</h3>
//               <ul className="space-y-2">
//                 {analysis.spikes.map((s, i) => (
//                   <li key={i} className="flex items-center justify-between rounded-md border p-2">
//                     <div>
//                       <div className="font-medium">{new Date(s.date).toLocaleDateString()}</div>
//                       <div className="text-xs opacity-70">z-score: {s.z}</div>
//                     </div>
//                     <div className="font-semibold">₹{currency(s.expense)}</div>
//                   </li>
//                 ))}
//                 {analysis.spikes.length === 0 && <div className="opacity-70 text-sm">No spikes detected</div>}
//               </ul>
//             </div>
//           </section>

//           {/* Monthly best/worst callouts */}
//           {(analysis.summary.bestMonth || analysis.summary.worstMonth) && (
//             <section className="rounded-xl border p-4">
//               <h3 className="font-semibold mb-2">Highlights</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                 {analysis.summary.bestMonth && (
//                   <div className="rounded-lg border p-3">
//                     <div className="text-sm opacity-70">Best Month</div>
//                     <div className="font-medium">{analysis.summary.bestMonth.label}</div>
//                     <div className="text-green-600 font-semibold">₹{analysis.summary.bestMonth.savings.toLocaleString(undefined, { maximumFractionDigits: 2 })} saved</div>
//                   </div>
//                 )}
//                 {analysis.summary.worstMonth && (
//                   <div className="rounded-lg border p-3">
//                     <div className="text-sm opacity-70">Worst Month</div>
//                     <div className="font-medium">{analysis.summary.worstMonth.label}</div>
//                     <div className="text-red-600 font-semibold">₹{analysis.summary.worstMonth.savings.toLocaleString(undefined, { maximumFractionDigits: 2 })} saved</div>
//                   </div>
//                 )}
//               </div>
//             </section>
//           )}

        
//         </>
//       )}
//     </div>
//   );
// }

// function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
//   return (
//     <div className="rounded-xl border p-3">
//       <div className="text-sm">{label}</div>
//       <div className="text-lg font-semibold" style={{ color: accent }}>{value}</div>
//       {accent && (
//         <div className="mt-2 h-1 rounded-full" style={{ background: accent, opacity: 0.5 }} />
//       )}
//     </div>
//   );
// }
