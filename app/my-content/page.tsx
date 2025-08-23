"use client";

import { useEffect, useState } from "react";
import { createUnsubscribeEvent, publishEvent } from "../../lib/nostr";

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
}

// 🔹 Funzione che trasforma il contenuto in media embeddati
function renderContent(content: string) {
    return content.split(/\s+/).map((word, i) => {
        // Immagini
        if (word.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
            return (
                <img
                    key={i}
                    src={word}
                    alt="media"
                    className="my-3 mx-auto rounded-xl shadow-lg max-w-md w-full h-auto"
                />
            );
        }

        // Video
        if (word.match(/\.(mp4|webm)$/i)) {
            return (
                <video
                    key={i}
                    src={word}
                    controls
                    className="my-3 mx-auto rounded-xl shadow-lg max-w-2xl w-full h-auto"
                />
            );
        }

        // YouTube
        if (word.includes("youtube.com") || word.includes("youtu.be")) {
            const embedUrl = word.includes("watch?v=")
                ? word.replace("watch?v=", "embed/")
                : word.replace("youtu.be/", "youtube.com/embed/");
            return (
                <div
                    key={i}
                    className="relative my-3 w-full max-w-2xl mx-auto"
                    style={{ paddingTop: "56.25%" }}
                >
                    <iframe
                        src={embedUrl}
                        className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        // Testo normale
        return word + " ";
    });
}

export default function MyContentPage() {
    const [unlockedPosts, setUnlockedPosts] = useState<Post[]>([]);
    const [loggedUser, setLoggedUser] = useState<any>(null);

    // 🔹 forza lo scroll in alto all'apertura
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const loadUnlockedPosts = () => {
        try {
            const unlockedIds: string[] = JSON.parse(
                localStorage.getItem("unlockedContent") || "[]"
            );
            const savedPosts: Post[] = JSON.parse(
                localStorage.getItem("savedPosts") || "[]"
            );
            const posts = savedPosts.filter((p) => unlockedIds.includes(p.id));
            setUnlockedPosts(posts);
        } catch (err) {
            console.error("Errore lettura localStorage:", err);
            setUnlockedPosts([]);
        }
    };

    const removePost = async (id: string) => {
        // Rimuove da localStorage
        const unlockedIds: string[] = JSON.parse(
            localStorage.getItem("unlockedContent") || "[]"
        );
        const updated = unlockedIds.filter((x) => x !== id);
        localStorage.setItem("unlockedContent", JSON.stringify(updated));

        setUnlockedPosts((prev) => prev.filter((p) => p.id !== id));

        try {
            if (!loggedUser) return;

            // ✅ Pubblica evento unsubscribe (kind 9736)
            const ev = createUnsubscribeEvent(id, loggedUser.npub);
            await publishEvent(ev);

            console.log("📤 Evento 9736 (unsubscribe) pubblicato per post", id);
        } catch (err) {
            console.error("Errore pubblicazione 9736:", err);
        }
    };

    useEffect(() => {
        loadUnlockedPosts();
        const onStorageChange = () => loadUnlockedPosts();
        window.addEventListener("storage", onStorageChange);

        const data = sessionStorage.getItem("loggedInUser");
        if (data) setLoggedUser(JSON.parse(data));

        return () => {
            window.removeEventListener("storage", onStorageChange);
        };
    }, []);

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-10 drop-shadow-sm">
                I miei contenuti sbloccati 🔓
            </h1>

            {unlockedPosts.length === 0 ? (
                <p className="text-gray-600 bg-white/70 px-6 py-4 rounded-xl shadow">
                    Nessun contenuto sbloccato ancora. ⚡
                </p>
            ) : (
                <div className="grid gap-8 w-full max-w-4xl">
                    {unlockedPosts.map((item) => (
                        <div
                            key={item.id}
                            className="relative border bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition transform hover:-translate-y-1"
                        >
                            <h2 className="text-2xl font-bold mb-2 text-gray-800">
                                {item.title}
                            </h2>

                            <div className="text-gray-700 mb-3 whitespace-pre-wrap break-words leading-relaxed">
                                {renderContent(item.fullContent)}
                            </div>

                            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                                <span>👤 Autore: {item.authorNpub?.slice(0, 12) || "sconosciuto"}…</span>
                                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium shadow-sm">
                                    🔒 {item.priceSats} sats
                                </span>
                            </div>

                            <div className="flex items-center gap-4 mt-6">
                                <a
                                    href={`/content/${item.id}`}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:scale-105 transition"
                                >
                                    Vai al post →
                                </a>

                                <button
                                    onClick={() => removePost(item.id)}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition"
                                >
                                    ❌ Rimuovi
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
