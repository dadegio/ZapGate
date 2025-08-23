"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

interface ZapChartProps {
    data: { date: string; sats: number }[];
}

export default function ZapChart({ data }: ZapChartProps) {
    // ordiniamo le date per leggibilità
    const sortedData = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
        <div className="bg-white/90 rounded-2xl shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
                📊 Sats guadagnati al giorno
            </h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} sats`} />
                    <Bar dataKey="sats" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
