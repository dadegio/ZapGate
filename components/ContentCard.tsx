'use client';
import { useState, useEffect } from 'react';
import { zapPayment } from '../lib/zaps';
import nodes from '../nodes-config.json';

export default function ContentCard({ item, loggedUser }: { item: any; loggedUser: any }) {
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ al mount controlla se già sbloccato
    useEffect(() => {
        const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
        if (unlockedContent.includes(item.id)) {
            setUnlocked(true);
        }
    }, [item.id]);

    const handleZap = async () => {
        try {
            setLoading(true);

            const receiver = nodes.find(
                (n) =>
                    n.name?.toLowerCase() === item.author?.toLowerCase() ||
                    n.pubkey?.toLowerCase() === item.authorPubkey?.toLowerCase()
            );
            if (!receiver) throw new Error(`Receiver non trovato per autore: ${item.author}`);

            const { zapRequest, zapReceipt } = await zapPayment(
                loggedUser,
                receiver,
                item.priceSats,
                `Zap per ${item.title}`
            );

            console.log("✅ ZapRequest:", zapRequest);
            console.log("✅ ZapReceipt:", zapReceipt);

            // ✅ salva come sbloccato
            const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
            if (!unlockedContent.includes(item.id)) {
                unlockedContent.push(item.id);
                localStorage.setItem("unlockedContent", JSON.stringify(unlockedContent));
            }

            setUnlocked(true);
        } catch (err) {
            console.error("❌ Errore pagamento:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border p-4 rounded bg-white shadow mb-4">
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p>{unlocked ? item.fullContent : item.preview}</p>
            {!unlocked && (
                <button
                    onClick={handleZap}
                    disabled={loading}
                    className="bg-yellow-500 text-white px-4 py-2 rounded mt-2"
                >
                    {loading ? "Pagamento..." : `Sblocca con ${item.priceSats} sats`}
                </button>
            )}
        </div>
    );
}
