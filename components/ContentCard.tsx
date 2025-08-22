'use client';
import { useState, useEffect } from 'react';
import { zapPayment } from '../lib/zaps';
import { countActivePurchases, createDeleteEvent, publishEvent } from '../lib/nostr';

interface ContentCardProps {
    item: Post;
    loggedUser: any;
    isAuthor?: boolean;
}

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
    preview?: string;
    relays: string[];
}

export default function ContentCard({ item, loggedUser, isAuthor }: ContentCardProps) {
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 🔍 inizializza stato sbloccato e conta acquisti attivi
    useEffect(() => {
        const unlockedContent = JSON.parse(localStorage.getItem("unlockedContent") || "[]");
        if (unlockedContent.includes(item.id) || isAuthor) {
            setUnlocked(true);
        }

        if (isAuthor) {
            countActivePurchases(item.id, item.relays).then(setPurchaseCount);
        }
    }, [item.id, isAuthor, item.relays]);

    const handleZap = async () => {
        try {
            setLoading(true);

            if (!item.authorNpub) throw new Error(`Item ${item.id} senza authorNpub`);
            if (!loggedUser?.npub) throw new Error("Utente loggato senza npub valido");

            const { zapRequest, zapReceipt } = await zapPayment(
                loggedUser.npub,
                item.authorNpub,
                item.priceSats,
                `Zap per ${item.title}`,
                item.id
            );

            console.log("✅ ZapRequest:", zapRequest);
            console.log("✅ ZapReceipt:", zapReceipt);

            // salva localmente
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

            // aggiorna conteggio attivo
            if (isAuthor) {
                const newCount = await countActivePurchases(item.id, item.relays);
                setPurchaseCount(newCount);
            }

        } catch (err) {
            console.error("❌ Errore pagamento:", err);
            alert("Errore pagamento: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCheck = async () => {
        if (!window.nostr) {
            alert("❌ Nessun provider Nostr trovato (Alby, nos2x, ecc.)");
            return;
        }

        if (!confirm("Vuoi davvero eliminare questo post?")) return;
        setIsDeleting(true);

        try {
            // controlla prima se ci sono ancora acquirenti
            const activeCount = await countActivePurchases(item.id, item.relays);
            if (activeCount > 0) {
                alert("❌ Impossibile eliminare: ci sono ancora utenti che hanno acquistato.");
                return;
            }

            // pubblica evento delete
            const ev = createDeleteEvent(item.id, "delete");
            await publishEvent(ev);

            alert("✅ Post eliminato!");
        } catch (err: any) {
            console.error("Errore eliminazione:", err);
            alert("Errore eliminazione: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsDeleting(false);
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
                        <p className="text-sm text-gray-500">🔢 Acquisti attivi: {purchaseCount}</p>
                    )}
                    <button
                        onClick={handleDeleteCheck}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded mt-2 bg-red-500 text-white hover:bg-red-600"
                    >
                        {isDeleting ? "Eliminazione..." : "🗑 Elimina"}
                    </button>
                </div>
            )}
        </div>
    );
}
