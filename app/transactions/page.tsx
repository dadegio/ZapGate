'use client';
import { useEffect, useState } from 'react';

export default function TransactionsPage() {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const data = localStorage.getItem('zapHistory');
        if (data) {
            setHistory(JSON.parse(data));
        }
    }, []);

    if (!history.length) {
        return <p className="mt-12 text-center">Nessuna transazione ancora ✨</p>;
    }

    return (
        <div className="space-y-4 mt-6">
            <h1 className="text-2xl font-bold mb-6">Storico Zap</h1>
            {history.map((tx, i) => (
                <div
                    key={i}
                    className="p-4 border rounded-lg bg-white shadow"
                >
                    <p className="text-sm text-gray-500">
                        {new Date(tx.time).toLocaleString()}
                    </p>
                    <p className="font-semibold">⚡ ZapRequest</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(tx.zapRequest, null, 2)}
          </pre>
                    <p className="font-semibold mt-2">📩 ZapReceipt</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(tx.zapReceipt, null, 2)}
          </pre>
                </div>
            ))}
        </div>
    );
}
