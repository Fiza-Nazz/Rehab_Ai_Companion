"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PainTrendChartProps {
  data: { date: string; pain: number; }[];
}

export default function PainTrendChart({ data }: PainTrendChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">14-Day Pain Trend</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 10]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A2E", borderRadius: "8px", border: "none", color: "#fff" }}
              itemStyle={{ color: "#fff" }}
            />
            <Line
              type="monotone"
              dataKey="pain"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
