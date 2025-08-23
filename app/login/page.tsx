'use client';

import { useState } from 'react';
import { relayInit } from 'nostr-tools';
import { RELAYS } from '../../lib/config';

declare global {
    interface Window {
        nostr?: {
            getPublicKey: () => Promise<string>;
            signEvent: (event: any) => Promise<any>;
        };
    }
}

export default function LoginPage() {
    const [pubkey, setPubkey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setError(null);
            setLoading(true);

            if (!window.nostr) {
                throw new Error('❌ Nessun provider Nostr trovato. Installa nos2x o Alby.');
            }

            // 🔑 1. Ottieni chiave pubblica
            const pubkeyHex = await window.nostr.getPublicKey();
            setPubkey(pubkeyHex);

            // 📝 2. Evento di login
            const event = {
                kind: 27235,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: 'Login a ZapGate',
                pubkey: pubkeyHex,
            };

            // 🔏 3. Firma evento
            const signedEvent = await window.nostr.signEvent(event);

            // 🌐 4. Recupera metadata kind:0
            let profile: { name?: string; picture?: string } = {};
            try {
                const relay = relayInit(RELAYS[0].url);
                await relay.connect();

                const sub = relay.sub([{ kinds: [0], authors: [pubkeyHex], limit: 1 }]);

                sub.on('event', (evt) => {
                    try {
                        const data = JSON.parse(evt.content);
                        profile = {
                            name: data.name,
                            picture: data.picture,
                        };
                    } catch (e) {
                        console.warn('❌ Errore parsing metadata', e);
                    }
                });

                await new Promise((resolve) => {
                    sub.on('eose', () => {
                        sub.unsub();
                        relay.close();
                        resolve(true);
                    });
                });
            } catch (e) {
                console.warn('⚠️ Nessun profilo trovato su relay', e);
            }

            // 💾 5. Salva utente
            const loggedUser = {
                npub: pubkeyHex,
                signedEvent,
                name: profile.name || null,
                picture: profile.picture || null,
            };
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedUser));

            // 🔄 redirect
            window.location.href = '/';
        } catch (err: any) {
            console.error('❌ Login error:', err);
            setError(err.message || 'Errore sconosciuto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 text-center px-6">
            <h1 className="text-5xl font-extrabold text-gray-800 mb-6">ZapGate ⚡</h1>
            <p className="mb-8 text-gray-600">Accedi con il tuo account Nostr</p>

            <button
                onClick={handleLogin}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold shadow transition disabled:opacity-50"
            >
                {loading ? '⏳ Connessione...' : 'Login con Nostr'}
            </button>

            {pubkey && (
                <p className="mt-6 text-gray-700">
                    ✅ Loggato come: <span className="font-mono">{pubkey.slice(0, 16)}...</span>
                </p>
            )}

            {error && <p className="text-red-500 mt-4 font-medium">{error}</p>}
        </div>
    );
}
