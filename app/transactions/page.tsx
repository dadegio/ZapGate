// app/transactions/page.tsx

"use client";
import { useEffect, useState } from "react";

export default function TransactionsPage() {
    const [zapHistory, setZapHistory] = useState<any[]>([]);
    const [eventHistory, setEventHistory] = useState<any[]>([]);
    const [filter, setFilter] = useState<"zapRequest" | "zapReceipt" | "other">("zapRequest");

    useEffect(() => {
        const zapData = localStorage.getItem("zapHistory");
        if (zapData) setZapHistory(JSON.parse(zapData));

        const otherData = localStorage.getItem("eventHistory");
        if (otherData) setEventHistory(JSON.parse(otherData));
    }, []);

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6">
                📜 Storico Eventi
            </h1>

            {/* 🔽 Filtro */}
            <div className="mb-10">
                <label className="text-sm font-semibold text-gray-700 mr-3">
                    Filtra eventi:
                </label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg shadow bg-white"
                >
                    <option value="zapRequest">⚡ ZapRequest</option>
                    <option value="zapReceipt">📩 ZapReceipt</option>
                    <option value="other">🌀 Altri Eventi</option>
                </select>
            </div>

            <div className="w-full max-w-5xl space-y-12">
                {/* 🔹 ZAP REQUEST */}
                {filter === "zapRequest" && (
                    <section>
                        <h2 className="text-2xl font-bold text-purple-700 mb-6">⚡ ZapRequest</h2>
                        {zapHistory.length === 0 ? (
                            <p className="text-gray-600">Nessuna transazione ancora ✨</p>
                        ) : (
                            <div className="space-y-6">
                                {zapHistory.map((tx, i) => (
                                    <div
                                        key={i}
                                        className="bg-white border rounded-xl shadow-lg p-6 space-y-4"
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-gray-500">
                                                {new Date(tx.time).toLocaleString()}
                                            </p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                                                ZapRequest #{i + 1}
                                            </span>
                                        </div>

                                        <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded shadow-inner overflow-x-auto">
                                            {JSON.stringify(tx.zapRequest, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 🔹 ZAP RECEIPT */}
                {filter === "zapReceipt" && (
                    <section>
                        <h2 className="text-2xl font-bold text-green-700 mb-6">📩 ZapReceipt</h2>
                        {zapHistory.length === 0 ? (
                            <p className="text-gray-600">Nessuna transazione ancora ✨</p>
                        ) : (
                            <div className="space-y-6">
                                {zapHistory.map((tx, i) => (
                                    <div
                                        key={i}
                                        className="bg-white border rounded-xl shadow-lg p-6 space-y-4"
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-gray-500">
                                                {new Date(tx.time).toLocaleString()}
                                            </p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                                                ZapReceipt #{i + 1}
                                            </span>
                                        </div>

                                        <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded shadow-inner overflow-x-auto">
                                            {JSON.stringify(tx.zapReceipt, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 🔹 ALTRI EVENTI */}
                {filter === "other" && (
                    <section>
                        <h2 className="text-2xl font-bold text-blue-700 mb-6">🌀 Altri Eventi</h2>
                        {eventHistory.length === 0 ? (
                            <p className="text-gray-600">Nessun evento registrato.</p>
                        ) : (
                            <div className="space-y-6">
                                {eventHistory.map((ev, i) => (
                                    <div
                                        key={i}
                                        className="bg-white border rounded-xl shadow-lg p-6"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm text-gray-500">
                                                {new Date(ev.time).toLocaleString()}
                                            </p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                                                Kind {ev.kind}
                                            </span>
                                        </div>

                                        <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded shadow-inner overflow-x-auto">
                                            {JSON.stringify(ev.event, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
