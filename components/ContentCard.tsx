// ContentCard.tsx
'use client';
import { useState, useEffect } from 'react';
import { zapPayment } from '../lib/zaps';
import { countPurchases, publishEvent, createDeleteEvent } from '../lib/nostr';

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
    preview?: string;
    relay: string[];
}

export default function ContentCard({
                                        item,
                                        loggedUser,
                                        isAuthor,
                                    }: {
    item: Post;
    loggedUser: any;
    isAuthor?: boolean;   // 👈 aggiunto qui
}) {
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [purchaseCount, setPurchaseCount] = useState<number | null>(null);

    useEffect(() => {
        const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
        if (unlockedContent.includes(item.id) || isAuthor) {
            setUnlocked(true);
        }

        if (isAuthor) {
            countPurchases(item.id).then(setPurchaseCount);
        }
    }, [item.id, isAuthor]);

    const handleZap = async () => {
        try {
            setLoading(true);

            if (!item.authorNpub) throw new Error(`Item ${item.id} senza authorNpub`);
            if (!loggedUser?.npub) throw new Error("Utente loggato senza npub valido");

            const { zapRequest, zapReceipt } = await zapPayment(
                loggedUser.npub,
                item.authorNpub,
                item.priceSats,
                `Zap per ${item.title}`
            );

            console.log("✅ ZapRequest:", zapRequest);
            console.log("✅ ZapReceipt:", zapReceipt);

            const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
            if (!unlockedContent.includes(item.id)) {
                unlockedContent.push(item.id);
                localStorage.setItem("unlockedContent", JSON.stringify(unlockedContent));
            }

            const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
            if (!savedPosts.find((p: any) => p.id === item.id)) {
                savedPosts.push(item);
                localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
            }

            setUnlocked(true);
        } catch (err) {
            console.error("❌ Errore pagamento:", err);
            alert("Errore pagamento: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCheck = async () => {
        const count = await countPurchases(item.id, item.relay); // usa tutti i relay dove esiste il post
        if (count === 0) {
            const deleteEvent = createDeleteEvent(item.id, "Autore ha eliminato il post");
            await publishEvent(deleteEvent);
            alert("✅ Post eliminato");
        } else {
            alert(`❌ Non puoi eliminare: già acquistato (${count} volte)`);
        }
    };

    return (
        <div className="border p-4 rounded bg-white shadow mb-4">
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p>{unlocked ? item.fullContent : item.preview || "🔒 Contenuto bloccato"}</p>

            {!unlocked && !isAuthor && (
                <button
                    onClick={handleZap}
                    disabled={loading}
                    className="bg-yellow-500 text-white px-4 py-2 rounded mt-2"
                >
                    {loading ? "Pagamento..." : `Sblocca con ${item.priceSats} sats`}
                </button>
            )}

            {isAuthor && (
                <div className="mt-2">
                    {purchaseCount !== null && (
                        <p className="text-sm text-gray-500">
                            🔢 Acquisti: {purchaseCount}
                        </p>
                    )}
                    <button
                        onClick={handleDeleteCheck}
                        className="bg-red-500 text-white px-4 py-2 rounded mt-2"
                    >
                        🗑 Elimina
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * @TODO
 * migliora elimina
 * migliora profilo
 * migliora transactions*/