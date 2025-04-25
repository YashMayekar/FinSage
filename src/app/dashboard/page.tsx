'use client'
import dynamic from "next/dynamic"
import { useState } from "react"
const AreaChartComponent = dynamic(() => import('@/components/analytics/chart-area-interactive'), { ssr: false })
import { useGeneratedData } from "@/hooks/Data-Generator";
import TopTransactionsChart from "@/components/analytics/Pie-chart";
import MonthlyStackedBarChart from "@/components/analytics/Bar-Chart";

export default function DashBoard() {
  const [dataSource, setDataSource] = useState<'local' | 'api'>('local');
  const generatedData = useGeneratedData({ dataSource });

  const toggleDataSource = () => {
    setDataSource(prev => prev === 'local' ? 'api' : 'local');
  };

  return (
    <div className="rounded-lg shadow p-3 gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">DashBoard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Data Source:</span>
          <button
            onClick={toggleDataSource}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors  ${
              dataSource === 'api' ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                dataSource === 'api' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium">
            {dataSource === 'local' ? 'Local' : 'API'}
          </span>
        </div>
      </div>

      <AreaChartComponent generatedData={generatedData} />
      <div className="">
        <TopTransactionsChart dataSource={dataSource} />
        <MonthlyStackedBarChart dataSource={dataSource} />
      </div>
    </div>
  );
}