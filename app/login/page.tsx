// app/login/page.tsx

'use client';

import { useState } from 'react';
import nostrMap from '../../nostr-map.json';

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

    const handleLogin = async () => {
        try {
            if (!window.nostr) {
                throw new Error("Nessun provider Nostr trovato. Installa Nos2x o Alby.");
            }

            // 🔑 Ottieni la chiave pubblica dall’estensione (hex)
            const npubHex = await window.nostr.getPublicKey();
            setPubkey(npubHex);

            // 🔎 Trova alias (nome) dal mapping
            const nodeName = (nostrMap as any)[npubHex];
            if (!nodeName) throw new Error("Account Nostr non collegato a un nodo");

            // 📡 Carica nodi dal backend
            const res = await fetch("/api/nodes");
            const nodes = await res.json();

            // ✅ Trova nodo: per nome (da mappa) oppure per nostr_pubkey diretto
            const node = nodes.find((n: any) =>
                n.name?.toLowerCase() === nodeName.toLowerCase() ||
                n.nostr_pubkey?.toLowerCase() === npubHex.toLowerCase()
            );

            if (!node) throw new Error("Nodo non trovato per questo account");

            // 🗝️ Salva utente loggato
            const loggedUser = { npub: npubHex, node };
            sessionStorage.setItem("loggedInUser", JSON.stringify(loggedUser));

            window.location.href = "/";
        } catch (err: any) {
            console.error("❌ Login error:", err);
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 text-center px-6">
            <h1 className="text-5xl font-extrabold text-gray-800 mb-6">ZapGate ⚡</h1>
            <p className="mb-8 text-gray-600">Login con il tuo account Nostr</p>

            <button
                onClick={handleLogin}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold shadow transition"
            >
                Login con Nostr
            </button>

            {pubkey && (
                <p className="mt-6 text-gray-700">
                    ✅ Loggato come: <span className="font-mono">{pubkey.slice(0, 16)}...</span>
                </p>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
}
