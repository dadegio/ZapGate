'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

function renderContent(content: string) {
    return content.split(/\s+/).map((word, i) => {
        // immagini
        if (word.match(/\.(jpeg|jpg|png|gif)$/i)) {
            return (
                <img
                    key={i}
                    src={word}
                    alt="media"
                    className="my-4 mx-auto rounded-xl shadow max-w-md w-full h-auto"
                />
            );
        }
        // video
        if (word.match(/\.(mp4|webm)$/i)) {
            return (
                <video
                    key={i}
                    src={word}
                    controls
                    className="my-4 mx-auto rounded-xl shadow max-w-2xl w-full h-auto"
                />
            );
        }
        // YouTube (responsive 16:9)
        if (word.includes("youtube.com") || word.includes("youtu.be")) {
            const embedUrl = word.includes("watch?v=")
                ? word.replace("watch?v=", "embed/")
                : word.replace("youtu.be/", "youtube.com/embed/");
            return (
                <div key={i} className="relative my-4 w-full max-w-2xl mx-auto" style={{ paddingTop: "42.857%" }}>
                    <iframe
                        src={embedUrl}
                        className="absolute top-0 left-0 w-full h-full rounded-xl shadow"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        }
        // altrimenti testo normale
        return word + " ";
    });
}

export default function ContentCard({ item, loggedUser, isAuthor }: ContentCardProps) {
    const router = useRouter();
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

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
            showToast("✅ Contenuto sbloccato con successo!");

            if (isAuthor) {
                const newCount = await countActivePurchases(item.id, item.relays);
                setPurchaseCount(newCount);
            }

        } catch (err) {
            console.error("❌ Errore pagamento:", err);
            showToast("Errore pagamento: " + (err as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.nostr) {
            showToast("❌ Nessun provider Nostr trovato", "error");
            return;
        }
        setIsDeleting(true);

        try {
            const activeCount = await countActivePurchases(item.id, item.relays);
            if (activeCount > 0) {
                showToast("❌ Impossibile eliminare: ci sono ancora utenti che hanno acquistato.", "error");
                return;
            }

            const ev = createDeleteEvent(item.id, "delete");
            await publishEvent(ev);

            showToast("✅ Post eliminato!");
            setTimeout(() => {
                router.push("/");
            }, 1500);
        } catch (err: any) {
            console.error("Errore eliminazione:", err);
            showToast("Errore eliminazione: " + (err.message || JSON.stringify(err)), "error");
        } finally {
            setIsDeleting(false);
            setShowConfirmDelete(false);
        }
    };

    return (
        <div className="border p-4 rounded bg-white shadow mb-4 relative">
            <h2 className="text-lg font-bold">{item.title}</h2>

            {/* 👇 Usa il parser solo se sbloccato */}
            <div className="prose max-w-none">
                {unlocked ? renderContent(item.fullContent) : item.preview || "🔒 Contenuto bloccato"}
            </div>

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

                    {!showConfirmDelete ? (
                        <button
                            onClick={() => setShowConfirmDelete(true)}
                            className="px-4 py-2 rounded mt-2 bg-red-500 text-white hover:bg-red-600"
                        >
                            🗑 Elimina
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-3 py-1 bg-red-600 text-white rounded"
                            >
                                {isDeleting ? "..." : "Conferma"}
                            </button>
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="px-3 py-1 bg-gray-300 rounded"
                            >
                                Annulla
                            </button>
                        </div>
                    )}
                </div>
            )}

            {toast && (
                <div className="fixed inset-0 flex items-center justify-center z-[9999]">
                    <div
                        className={`px-6 py-4 rounded-xl shadow-2xl text-white font-semibold animate-fadeIn
                            ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}
