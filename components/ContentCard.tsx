// components/ContentCard.tsx
'use client';
import { useState, useEffect } from 'react';
import { zapPayment } from '../lib/zaps';
import { countPurchases, publishEvent, createDeleteEvent } from '../lib/nostr';
import { countActivePurchases } from "../lib/nostr";
import {relayInit} from "nostr-tools";

interface ContentCardProps {
    item: any;
    loggedUser: any;
    isAuthor: boolean;
}

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
    preview?: string;
    relays: string[];   // 👈 assicuriamoci sia array
}

export default function ContentCard({
                                        item,
                                        loggedUser,
                                        isAuthor,
                                    }: {
    item: Post;
    loggedUser: any;
    isAuthor?: boolean;
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
            countPurchases(item.id, item.relays).then(setPurchaseCount);
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
                item.id  // 👈 passa contentId
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

            // 🔢 aggiorna counter subito
            if (isAuthor) {
                const newCount = await countPurchases(item.id, item.relays);
                setPurchaseCount(newCount);
            }
        } catch (err) {
            console.error("❌ Errore pagamento:", err);
            alert("Errore pagamento: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteCheck = async () => {
        if (!window.nostr) {
            alert("❌ Nessun provider Nostr trovato (Alby, nos2x, ecc.)");
            return;
        }

        if (!confirm("Vuoi davvero eliminare questo post?")) return;
        setIsDeleting(true);

        try {
            const activeCount = await countActivePurchases(item.id, item.relays);
            console.log("🔍 Compratori attivi:", activeCount);

            if (activeCount > 0) {
                alert("❌ Impossibile eliminare: ci sono ancora utenti che hanno acquistato.");
                setIsDeleting(false);
                return;
            }

            for (const url of item.relays) {
                const ev = {
                    kind: 5,
                    pubkey: loggedUser.npub,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [["e", item.id]],
                    content: "delete",
                };

                const signed = await window.nostr.signEvent(ev);

                const relay = relayInit(url); // ⬅ usa import, non window
                await relay.connect();
                relay.publish(signed);
            }

            alert("✅ Post eliminato!");
        } catch (err: any) {
            console.error("Errore eliminazione:", err);
            alert("Errore eliminazione: " + err.message);
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
                        <p className="text-sm text-gray-500">
                            🔢 Acquisti: {purchaseCount}
                        </p>
                    )}
                    <button
                        onClick={handleDeleteCheck}
                        disabled={purchaseCount !== 0}
                        className={`px-4 py-2 rounded mt-2 ${
                            purchaseCount === 0
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-gray-300 text-gray-600 cursor-not-allowed"
                        }`}
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