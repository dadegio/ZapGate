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
                    className="my-3 mx-auto rounded-lg shadow max-w-md w-full h-auto"
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
                    className="my-3 mx-auto rounded-lg shadow max-w-2xl w-full h-auto"
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
                        className="absolute top-0 left-0 w-full h-full rounded-lg shadow"
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
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-10">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-6">
                I miei contenuti sbloccati 🔓
            </h1>

            {unlockedPosts.length === 0 ? (
                <p className="text-gray-500">Nessun contenuto sbloccato ancora. ⚡</p>
            ) : (
                <div className="grid gap-6 w-full max-w-3xl">
                    {unlockedPosts.map((item) => (
                        <div
                            key={item.id}
                            className="border bg-white rounded-lg shadow p-6 text-left"
                        >
                            <h2 className="text-xl font-bold mb-2">{item.title}</h2>

                            <div className="text-gray-700 mb-2 whitespace-pre-wrap break-words">
                                {renderContent(item.fullContent)}
                            </div>

                            <p className="mt-2 text-sm text-gray-500">
                                Autore: {item.authorNpub?.slice(0, 12) || "sconosciuto"}…
                            </p>

                            <a
                                href={`/content/${item.id}`}
                                className="inline-block mt-3 text-purple-600 hover:text-purple-800 underline text-sm"
                            >
                                Vai al post →
                            </a>

                            <button
                                onClick={() => removePost(item.id)}
                                className="ml-4 inline-block text-red-500 hover:text-red-700 text-sm"
                            >
                                Rimuovi ❌
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
