// app/content/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pool } from '../../../lib/nostr';
import { RELAYS } from '../../../lib/config';
import ContentCard from '../../../components/ContentCard';

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
}

export default function ContentPage() {
    const params = useParams();
    const router = useRouter();
    const [loggedUser, setLoggedUser] = useState<any>(null);
    const [item, setItem] = useState<Post | null>(null);

    // ✅ recupera utente loggato
    useEffect(() => {
        const data = sessionStorage.getItem('loggedInUser');
        if (data) {
            setLoggedUser(JSON.parse(data));
        } else {
            router.push('/login');
        }
    }, [router]);

    // ✅ carica contenuto da Nostr
    useEffect(() => {
        if (!params?.id) return;
        if (!loggedUser) return;

        const sub = pool.sub(
            RELAYS,
            [{ ids: [params.id as string] }] // filtro per ID evento
        );

        sub.on('event', (event) => {
            console.log('📥 Contenuto caricato:', event);

            setItem({
                id: event.id,
                title: event.tags.find((t) => t[0] === 'title')?.[1] || 'Senza titolo',
                fullContent: event.content,
                priceSats: parseInt(
                    event.tags.find((t) => t[0] === 'price_sats')?.[1] || '0',
                    10
                ),
                authorNpub: event.pubkey,
            });

            sub.unsub(); // chiudi la sub dopo aver trovato l’evento
        });

        sub.on('eose', () => {
            console.log('🚫 Nessun evento trovato per questo ID');
        });

        return () => sub.unsub();
    }, [params?.id, loggedUser]);

    if (!loggedUser) return null;

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                ⏳ Caricamento contenuto...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-6 py-10 animate-fadeIn">
            {/* 🔙 Pulsante back */}
            <button
                onClick={() => router.back()}
                className="mb-6 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-gray-700 rounded-lg shadow-sm transition"
            >
                ⬅ Torna indietro
            </button>

            <h1 className="text-3xl font-extrabold text-gray-800 mb-6 drop-shadow">
                {item.title}
            </h1>

            <div className="bg-white/90 rounded-2xl shadow-lg p-6">
                <ContentCard item={item} loggedUser={loggedUser} />
            </div>
        </div>
    );
}
