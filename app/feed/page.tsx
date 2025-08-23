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

interface Profile {
    npub: string;
    name?: string;
    about?: string;
    picture?: string;
}

export default function FollowingPage() {
    const [authors, setAuthors] = useState<string[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [postsByAuthor, setPostsByAuthor] = useState<Record<string, Post[]>>(
        {}
    );

    // Recupera seguiti
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("followedAuthors") || "[]");
        setAuthors(stored);
    }, []);

    // Carica profili kind:0
    useEffect(() => {
        if (authors.length === 0) return;

        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [0], authors }]
        );

        sub.on("event", (event) => {
            try {
                const metadata = JSON.parse(event.content);
                setProfiles((prev) => ({
                    ...prev,
                    [event.pubkey]: {
                        npub: event.pubkey,
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                    },
                }));
            } catch {
                console.warn("❌ Errore parsing profilo", event.content);
            }
        });

        sub.on("eose", () => sub.unsub());
        return () => sub.unsub();
    }, [authors]);

    // Carica post kind:30023
    useEffect(() => {
        if (authors.length === 0) return;

        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [30023], authors, limit: 30 }]
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

            setPostsByAuthor((prev) => {
                const existing = prev[event.pubkey] || [];
                if (existing.find((p) => p.id === post.id)) return prev;
                return {
                    ...prev,
                    [event.pubkey]: [post, ...existing].slice(0, 3), // max 3 preview
                };
            });
        });

        sub.on("eose", () => sub.unsub());
        return () => sub.unsub();
    }, [authors]);

    if (authors.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                ❌ Non segui ancora nessun autore.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 px-6 py-12">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-10 text-center">
                ⭐ I tuoi autori seguiti
            </h1>

            <div className="space-y-10 max-w-6xl mx-auto">
                {authors.map((npub) => {
                    const profile = profiles[npub];
                    const posts = postsByAuthor[npub] || [];

                    return (
                        <div
                            key={npub}
                            className="bg-white/90 rounded-2xl shadow-lg p-6 backdrop-blur-sm hover:shadow-xl transition"
                        >
                            {/* Header autore */}
                            <div className="flex items-center gap-4 mb-6">
                                {profile?.picture ? (
                                    <img
                                        src={profile.picture}
                                        alt={profile.name || "Autore"}
                                        className="w-16 h-16 rounded-full border-2 border-purple-400 shadow"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-purple-300 flex items-center justify-center font-bold text-xl text-white shadow">
                                        {profile?.name?.[0] || "?"}
                                    </div>
                                )}
                                <div>
                                    <Link
                                        href={`/profile/${npub}`}
                                        className="text-lg font-bold text-purple-700 hover:underline"
                                    >
                                        {profile?.name || npub.slice(0, 12) + "…"}
                                    </Link>
                                    {profile?.about && (
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {profile.about}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Post autore */}
                            {posts.length === 0 ? (
                                <p className="text-gray-500 italic">
                                    Nessun contenuto pubblicato.
                                </p>
                            ) : (
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {posts.map((post) => (
                                        <Link key={post.id} href={`/content/${post.id}`}>
                                            <div className="p-4 border rounded-xl bg-gray-50 shadow-sm hover:bg-gray-100 transition">
                                                <h3 className="font-semibold text-gray-800 line-clamp-1">
                                                    {post.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 line-clamp-2">
                                                    {post.preview}
                                                </p>
                                                <span className="text-xs text-purple-600 mt-2 block">
                          🔒 {post.priceSats} sats
                        </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {posts.length > 0 && (
                                <div className="mt-4 text-right">
                                    <Link
                                        href={`/profile/${npub}`}
                                        className="text-sm font-semibold text-purple-600 hover:underline"
                                    >
                                        Vedi tutti i post →
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
