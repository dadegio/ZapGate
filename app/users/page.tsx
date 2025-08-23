"use client";

import { useState } from "react";
import { relayInit } from "nostr-tools";
import { RELAYS } from "../../lib/config";
import Link from "next/link";

interface Profile {
    npub: string;
    name?: string;
    about?: string;
    picture?: string;
    lud16?: string;
}

export default function UsersPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setResults([]);

        const profiles: Record<string, Profile> = {};

        for (const { url } of RELAYS) {
            try {
                const relay = relayInit(url);
                await relay.connect();
                const sub = relay.sub([{ kinds: [0], search: query, limit: 20 }]);

                sub.on("event", (event) => {
                    try {
                        const metadata = JSON.parse(event.content);
                        const lowerQuery = query.toLowerCase();

                        if (
                            metadata.name?.toLowerCase().includes(lowerQuery) ||
                            metadata.lud16?.toLowerCase().includes(lowerQuery)
                        ) {
                            profiles[event.pubkey] = {
                                npub: event.pubkey,
                                name: metadata.name,
                                about: metadata.about,
                                picture: metadata.picture,
                                lud16: metadata.lud16,
                            };
                            setResults(Object.values(profiles));
                        }
                    } catch {}
                });


                sub.on("eose", () => sub.unsub());
            } catch (err) {
                console.warn("Errore relay", url, err);
            }
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-6">
                🔍 Ricerca utenti
            </h1>

            <form onSubmit={handleSearch} className="flex justify-center mb-8">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cerca per nome o npub..."
                    className="w-full max-w-lg px-4 py-2 rounded-l-xl border focus:ring-2 focus:ring-purple-400"
                />
                <button
                    type="submit"
                    className="bg-purple-600 text-white px-5 rounded-r-xl hover:bg-purple-700"
                >
                    Cerca
                </button>
            </form>

            {loading && <p className="text-center text-gray-600">⏳ Ricerca...</p>}

            <div className="grid gap-6 max-w-4xl mx-auto">
                {results.map((u) => (
                    <Link key={u.npub} href={`/profile/${u.npub}`}>
                        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                            {u.picture ? (
                                <img
                                    src={u.picture}
                                    alt="avatar"
                                    className="w-14 h-14 rounded-full object-cover shadow"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-300" />
                            )}
                            <div>
                                <h2 className="font-bold text-lg">{u.name || "Anonimo"}</h2>
                                <p className="text-sm text-gray-500 break-all">{u.npub}</p>
                                {u.lud16 && <p className="text-xs text-purple-600">⚡ {u.lud16}</p>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {results.length === 0 && !loading && (
                <p className="text-center text-gray-500 mt-6">Nessun utente trovato.</p>
            )}
        </div>
    );
}
