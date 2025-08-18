'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEMO_CONTENT } from '../../../lib/content';
import ContentCard from '../../../components/ContentCard';

export default function ContentPage() {
    const params = useParams();
    const router = useRouter();
    const [loggedUser, setLoggedUser] = useState<any>(null);

    useEffect(() => {
        const data = sessionStorage.getItem('loggedInUser');
        if (data) {
            setLoggedUser(JSON.parse(data));
        } else {
            router.push('/login');
        }
    }, [router]);

    if (!loggedUser) return null;

    const item = DEMO_CONTENT.find(c => c.id === params.id);
    if (!item) return <p>❌ Contenuto non trovato.</p>;

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
