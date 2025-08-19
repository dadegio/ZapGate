"use client";

import { useEffect, useState } from "react";

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
}

export default function MyContentPage() {
    const [unlockedPosts, setUnlockedPosts] = useState<Post[]>([]);

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

    useEffect(() => {
        loadUnlockedPosts();

        // 🔄 aggiorna anche se cambia localStorage (es. in un’altra scheda)
        const onStorageChange = () => loadUnlockedPosts();
        window.addEventListener("storage", onStorageChange);

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
                            <p className="text-gray-700">{item.fullContent}</p>
                            <p className="mt-2 text-sm text-gray-500">
                                Autore: {item.authorNpub?.slice(0, 12) || "sconosciuto"}…
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
