'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RELAYS } from '../../lib/config';
import { relayInit } from 'nostr-tools';

export default function CreatePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [fullContent, setFullContent] = useState('');
    const [priceSats, setPriceSats] = useState(0);
    const [loggedUser, setLoggedUser] = useState<any>(null);
    const [selectedRelays, setSelectedRelays] = useState<string[]>([]);

    useEffect(() => {
        const stored = sessionStorage.getItem('loggedInUser');
        if (stored) {
            setLoggedUser(JSON.parse(stored));
        } else {
            router.push('/login');
        }
    }, [router]);

    const toggleRelay = (url: string) => {
        setSelectedRelays((prev) =>
            prev.includes(url) ? prev.filter((r) => r !== url) : [...prev, url]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loggedUser) return;

        try {
            if (!window.nostr) {
                alert('Nessun provider Nostr trovato (Alby, nos2x, ecc.)');
                return;
            }

            const pubkey = await window.nostr.getPublicKey();
            const eventTemplate = {
                kind: 30023,
                pubkey,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['title', title],
                    ['price_sats', String(priceSats)],
                    ['ln_pubkey', loggedUser.node?.pubkey || ''],
                ],
                content: fullContent,
            };

            const signedEvent = await window.nostr.signEvent(eventTemplate);

            // Pubblica solo sui relay scelti
            for (const url of selectedRelays) {
                const relay = relayInit(url);
                await relay.connect();
                console.log(`✅ Pubblico su ${url}`);
                relay.publish(signedEvent);
            }

            alert('✅ Post pubblicato su Nostr!');
            router.push('/');
        } catch (err) {
            console.error('❌ Errore pubblicazione:', err);
            alert('Errore pubblicazione: ' + (err as any).message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-6">
            <div className="bg-white/90 rounded-2xl shadow-lg p-8 max-w-xl w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">✍️ Crea nuovo articolo</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Titolo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <textarea
                        placeholder="Contenuto completo"
                        value={fullContent}
                        onChange={(e) => setFullContent(e.target.value)}
                        required
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <input
                        type="number"
                        placeholder="Prezzo in sats"
                        value={priceSats}
                        onChange={(e) => setPriceSats(Number(e.target.value))}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />

                    {/* ✅ Checkbox per i relay */}
                    <fieldset className="space-y-2">
                        <legend className="font-medium">Seleziona relay</legend>
                        {RELAYS.map((r) => (
                            <label key={r.url} className="block">
                                <input
                                    type="checkbox"
                                    checked={selectedRelays.includes(r.url)}
                                    onChange={() => toggleRelay(r.url)}
                                    className="mr-2"
                                />
                                {r.name}
                            </label>
                        ))}
                    </fieldset>

                    <button
                        type="submit"
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition"
                    >
                        Pubblica ⚡
                    </button>
                </form>
            </div>
        </div>
    );
}
