// app/transactions/page.tsx

"use client";
import { useEffect, useState } from "react";

export default function TransactionsPage() {
    const [zapHistory, setZapHistory] = useState<any[]>([]);
    const [eventHistory, setEventHistory] = useState<any[]>([]);
    const [filter, setFilter] = useState<"zapRequest" | "zapReceipt" | "unsubscribe" | "reaction" | "comment" | "other">("zapRequest");

    useEffect(() => {
        const zapData = localStorage.getItem("zapHistory");
        if (zapData) setZapHistory(JSON.parse(zapData));

        const otherData = localStorage.getItem("eventHistory");
        if (otherData) setEventHistory(JSON.parse(otherData));
    }, []);

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow mb-8">
                📜 Storico Eventi
            </h1>

            {/* 🔽 Filtro */}
            <div className="mb-12 flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">
                    Filtra eventi:
                </label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                >
                    <option value="zapRequest">⚡ ZapRequest</option>
                    <option value="zapReceipt">📩 ZapReceipt</option>
                    <option value="unsubscribe">❌ Unsubscribe</option>
                    <option value="reaction">❤️ Reazioni</option>
                    <option value="comment">💬 Commenti</option>
                    <option value="other">🌀 Altri Eventi</option>
                </select>
            </div>

            <div className="w-full max-w-5xl space-y-12">
                {/* 🔹 ZAP REQUEST */}
                {filter === "zapRequest" && (
                    <section>
                        <h2 className="text-2xl font-bold text-purple-700 mb-6">⚡ ZapRequest</h2>
                        {zapHistory.length === 0 ? (
                            <p className="text-gray-600 italic">Nessuna transazione ancora ✨</p>
                        ) : (
                            <div className="grid gap-6">
                                {zapHistory.map((tx, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">
                                                {new Date(tx.time).toLocaleString()}
                                            </p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                                                ZapRequest #{i + 1}
                                            </span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
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
                            <p className="text-gray-600 italic">Nessuna transazione ancora ✨</p>
                        ) : (
                            <div className="grid gap-6">
                                {zapHistory.map((tx, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">
                                                {new Date(tx.time).toLocaleString()}
                                            </p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                                                ZapReceipt #{i + 1}
                                            </span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                                            {JSON.stringify(tx.zapReceipt, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 🔹 UNSUBSCRIBE */}
                {filter === "unsubscribe" && (
                    <section>
                        <h2 className="text-2xl font-bold text-red-700 mb-6">❌ Unsubscribe</h2>
                        {eventHistory.filter(ev => ev.kind === 9736).length === 0 ? (
                            <p className="text-gray-600 italic">Nessun unsubscribe registrato.</p>
                        ) : (
                            <div className="grid gap-6">
                                {eventHistory.filter(ev => ev.kind === 9736).map((ev, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-red-100 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">{new Date(ev.time).toLocaleString()}</p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Unsubscribe</span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                                            {JSON.stringify(ev.event, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 🔹 REAZIONI */}
                {filter === "reaction" && (
                    <section>
                        <h2 className="text-2xl font-bold text-pink-700 mb-6">❤️ Reazioni</h2>
                        {eventHistory.filter(ev => ev.kind === 7).length === 0 ? (
                            <p className="text-gray-600 italic">Nessuna reazione registrata.</p>
                        ) : (
                            <div className="grid gap-6">
                                {eventHistory.filter(ev => ev.kind === 7).map((ev, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">{new Date(ev.time).toLocaleString()}</p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-pink-100 text-pink-700 rounded-full">Reazione</span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                                            {JSON.stringify(ev.event, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 🔹 COMMENTI */}
                {filter === "comment" && (
                    <section>
                        <h2 className="text-2xl font-bold text-blue-700 mb-6">💬 Commenti</h2>
                        {eventHistory.filter(ev => ev.kind === 1).length === 0 ? (
                            <p className="text-gray-600 italic">Nessun commento registrato.</p>
                        ) : (
                            <div className="grid gap-6">
                                {eventHistory.filter(ev => ev.kind === 1).map((ev, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">{new Date(ev.time).toLocaleString()}</p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">Commento</span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                                            {JSON.stringify(ev.event, null, 2)}
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
                        <h2 className="text-2xl font-bold text-gray-700 mb-6">🌀 Altri Eventi</h2>
                        {eventHistory.filter(ev => ![1, 7, 9736].includes(ev.kind)).length === 0 ? (
                            <p className="text-gray-600 italic">Nessun evento registrato.</p>
                        ) : (
                            <div className="grid gap-6">
                                {eventHistory.filter(ev => ![1, 7, 9736].includes(ev.kind)).map((ev, i) => (
                                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-sm text-gray-500">{new Date(ev.time).toLocaleString()}</p>
                                            <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">Kind {ev.kind}</span>
                                        </div>
                                        <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
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
