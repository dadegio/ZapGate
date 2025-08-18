'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEMO_CONTENT } from '../lib/content';

export default function Page() {
    const [loggedUser, setLoggedUser] = useState<any>(null);

    useEffect(() => {
        const data = sessionStorage.getItem('loggedInUser');
        if (data) {
            setLoggedUser(JSON.parse(data));
        } else {
            window.location.href = '/login';
        }
    }, []);

    if (!loggedUser) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Hero header */}
            <section className="text-center py-14">
                <h1 className="text-5xl font-extrabold text-gray-800 drop-shadow mb-3">
                    ⚡ Benvenuto {loggedUser.name}!
                </h1>
                <p className="text-gray-600 text-lg">
                    Sblocca contenuti esclusivi con Lightning
                </p>
            </section>

            {/* Lista articoli */}
            <main className="max-w-5xl mx-auto px-6 pb-16">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DEMO_CONTENT.map((item) => (
                        <Link key={item.id} href={`/content/${item.id}`}>
                            <div className="bg-white/90 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition transform p-6 cursor-pointer relative overflow-hidden backdrop-blur-sm">
                                {/* Fulmine decorativo in background */}
                                <div className="absolute right-4 top-4 text-purple-200 text-5xl opacity-30">
                                    ⚡
                                </div>

                                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                                    {item.title}
                                </h2>
                                <p className="text-gray-600 line-clamp-2">{item.preview}</p>
                                <span className="inline-block mt-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-semibold px-4 py-1 rounded-full shadow">
                                    🔒 {item.priceSats} sats
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
