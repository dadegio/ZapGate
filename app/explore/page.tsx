"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pool } from "../../lib/nostr";
import { RELAYS } from "../../lib/config";

interface Post {
    id: string;
    title: string;
    preview: string;
    priceSats: number;
    authorNpub: string;
}

export default function ExplorePage() {
    const [trending, setTrending] = useState<Record<string, number>>({});
    const [posts, setPosts] = useState<Post[]>([]);

    // 🔹 Raccogli zap receipts e reazioni
    useEffect(() => {
        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [9735, 7], limit: 500 }]
        );

        sub.on("event", (event) => {
            const postId = event.tags.find((t) => t[0] === "e")?.[1];
            if (!postId) return;

            setTrending((prev) => ({
                ...prev,
                [postId]: (prev[postId] || 0) + 1,
            }));
        });

        sub.on("eose", () => sub.unsub());
        return () => sub.unsub();
    }, []);

    // 🔹 Carica i post reali dai trending IDs
    useEffect(() => {
        const ids = Object.keys(trending);
        if (ids.length === 0) return;

        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [30023], ids, limit: 100 }]
        );

        sub.on("event", (event) => {
            const titleTag = event.tags.find((t) => t[0] === "title");
            const priceTag = event.tags.find((t) => t[0] === "price_sats");

            const post: Post = {
                id: event.id,
                title: titleTag?.[1] || "Senza titolo",
                preview: event.content.split(" ").slice(0, 20).join(" ") + "...",
                priceSats: priceTag ? parseInt(priceTag[1]) : 0,
                authorNpub: event.pubkey,
            };

            setPosts((prev) => {
                if (prev.find((p) => p.id === post.id)) return prev;
                return [...prev, post];
            });
        });

        sub.on("eose", () => sub.unsub());
        return () => sub.unsub();
    }, [trending]);

    // 🔹 Ordina i post per popolarità
    const sorted = [...posts].sort(
        (a, b) => (trending[b.id] || 0) - (trending[a.id] || 0)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 px-6 py-14">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow mb-10 text-center">
                    🔥 Trending Post
                </h1>

                {sorted.length === 0 ? (
                    <p className="text-center text-gray-600 animate-pulse">
                        ⏳ Caricamento trend...
                    </p>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sorted.map((post) => (
                            <Link key={post.id} href={`/content/${post.id}`}>
                                <div className="relative bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition transform p-6 cursor-pointer backdrop-blur-sm">
                                    {/* Badge popolarità */}
                                    <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                                        🔥 {trending[post.id] || 0}
                                    </div>

                                    <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-1">
                                        {post.title}
                                    </h2>
                                    <p className="text-gray-600 text-sm line-clamp-3">
                                        {post.preview}
                                    </p>

                                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                        <span>🔒 {post.priceSats} sats</span>
                                        <span className="font-mono text-xs">
                      {post.authorNpub.slice(0, 10)}…
                    </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
