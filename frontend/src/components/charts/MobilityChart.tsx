"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MobilityChartProps {
  data: { date: string; mobility: number; }[];
}

export default function MobilityChart({ data }: MobilityChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mobility Progress</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} domain={[0, 10]} />
            <Tooltip
              cursor={{ fill: "#F3F4F6" }}
              contentStyle={{ backgroundColor: "#1A1A2E", borderRadius: "8px", border: "none", color: "#fff" }}
            />
            <Bar dataKey="mobility" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
