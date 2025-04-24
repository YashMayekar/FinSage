// page.tsx
'use client'
import dynamic from "next/dynamic"
const AreaChartComponent = dynamic(() => import('@/components/chart-area-interactive'), { ssr: false })
import { useGeneratedData } from "@/hooks/Data-Generator";
import TopTransactionsChart from "@/components/analytics/Pie-chart";
import MonthlyStackedBarChart from "@/components/analytics/Bar-Chart";

export default function DashBoard() {
  const generatedData = useGeneratedData();

  return (
    <div className="rounded-lg shadow p-3 gap-4">
      <h1 className="text-3xl font-bold">DashBoard</h1>
      <AreaChartComponent generatedData={generatedData} />
      <div className="" >
      <TopTransactionsChart />
      <MonthlyStackedBarChart />
      </div>
    </div>
  );
}