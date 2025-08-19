'use client';

import { useEffect, useState } from 'react';
import nostrMap from '../../nostr-map.json';

declare global {
    interface Window {
        nostr?: {
            getPublicKey: () => Promise<string>;
            signEvent: (event: any) => Promise<any>; // 👈 aggiungi questo
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

            // Ottieni chiave pubblica dall’estensione (NIP-07)
            const npubHex = await window.nostr.getPublicKey();

            // Convertila in npub bech32
            // Nota: se ti serve puoi usare nostr-tools nip19
            const npub = npubHex.startsWith("npub") ? npubHex : npubHex;

            setPubkey(npub);

            // Mappa al nodo Polar
            const nodeId = (nostrMap as any)[npub];
            if (!nodeId) throw new Error("Account non collegato a nodo Polar");

            // Carica nodi disponibili
            const res = await fetch("/api/nodes");
            const nodes = await res.json();
            const node = nodes.find((n: any) =>
                n.id?.toLowerCase() === nodeId.toLowerCase() ||
                n.name?.toLowerCase() === nodeId.toLowerCase() ||
                n.pubkey?.toLowerCase() === nodeId.toLowerCase()
            );

            if (!node) throw new Error("Nodo non trovato per questo account");

            const loggedUser = { npub, node };
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
