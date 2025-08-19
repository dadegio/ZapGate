"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DEMO_CONTENT } from "../../../lib/content";

export default function ProfilePage() {
    const { npub } = useParams(); // npub dall’URL
    const [authorPosts, setAuthorPosts] = useState<any[]>([]);

    useEffect(() => {
        if (npub) {
            // Filtra contenuti di quell’autore
            const posts = DEMO_CONTENT.filter((p) => p.authorNpub === npub);
            setAuthorPosts(posts);
        }
    }, [npub]);

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-10">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
                Profilo Autore ⚡
            </h1>
            <p className="text-gray-600 mb-8 font-mono break-all">
                npub: {npub}
            </p>

            {authorPosts.length === 0 ? (
                <p className="text-gray-500">Nessun contenuto trovato.</p>
            ) : (
                <div className="grid gap-6 w-full max-w-3xl">
                    {authorPosts.map((item) => (
                        <div
                            key={item.id}
                            className="border bg-white rounded-lg shadow p-6 text-left"
                        >
                            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
                            <p className="text-gray-600">{item.preview}</p>
                            <p className="mt-2 text-sm text-gray-500">
                                Prezzo: {item.priceSats} sats
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
