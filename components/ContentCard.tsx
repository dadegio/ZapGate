'use client';
import { useState, useEffect } from 'react';
import { zapPayment } from '../lib/zaps';
import { countPurchases, pool, publishEvent, createDeleteEvent } from '../lib/nostr';
import { RELAYS } from "../lib/config";

export default function ContentCard({ item, loggedUser }: { item: any; loggedUser: any }) {
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [purchaseCount, setPurchaseCount] = useState<number | null>(null);

    useEffect(() => {
        const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
        if (unlockedContent.includes(item.id)) {
            setUnlocked(true);
        }

        // Se autore → conta quante volte è stato comprato
        if (loggedUser?.npub === item.authorNpub) {
            countPurchases(item.id).then(setPurchaseCount);
        }
    }, [item.id, loggedUser?.npub, item.authorNpub]);

    const handleZap = async () => {
        try {
            setLoading(true);

            if (!item.authorNpub) {
                throw new Error(`Item ${item.id} senza authorNpub, impossibile zapparlo`);
            }
            if (!loggedUser?.npub) {
                throw new Error("Utente loggato senza npub valido");
            }

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
        const count = await countPurchases(item.id);
        if (count === 0) {
            console.log("🗑 Nessuno ha comprato → posso eliminare");

            // 🔥 creo evento di delete
            const deleteEvent = createDeleteEvent(item.id, "Autore ha eliminato il post");
            await publishEvent(deleteEvent);

            alert("✅ Post eliminato dai relay (kind 5 pubblicato)");
        } else {
            alert("❌ Non puoi eliminare: il contenuto è già stato acquistato");
        }
    };

    return (
        <div className="border p-4 rounded bg-white shadow mb-4">
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p>{unlocked ? item.fullContent : item.preview}</p>

            {/* Bottone sblocco solo se NON sbloccato */}
            {!unlocked && (
                <button
                    onClick={handleZap}
                    disabled={loading}
                    className="bg-yellow-500 text-white px-4 py-2 rounded mt-2"
                >
                    {loading ? "Pagamento..." : `Sblocca con ${item.priceSats} sats`}
                </button>
            )}

            {/* Se autore → mostra contatore + tasto elimina */}
            {loggedUser?.npub === item.authorNpub && (
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
 * delete da migliorare
 * da sbloccati poter vedere la pagina dell'articolo
 * chi crea non li vede in home e non deve comprarli
 * */