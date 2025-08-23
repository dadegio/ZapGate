// app/content/[id]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { pool } from "../../../lib/nostr";
import { RELAYS } from "../../../lib/config";
import ContentCard from "../../../components/ContentCard";
import { ArrowLeft } from "lucide-react";

interface Post {
    id: string;
    title: string;
    fullContent: string;
    priceSats: number;
    authorNpub: string;
    preview?: string;
    relays: string[];
}

export default function ContentPage() {
    const params = useParams();
    const router = useRouter();
    const [loggedUser, setLoggedUser] = useState<any>(null);
    const [item, setItem] = useState<Post | null>(null);

    // ✅ recupera utente loggato
    useEffect(() => {
        const data = sessionStorage.getItem("loggedInUser");
        if (data) {
            setLoggedUser(JSON.parse(data));
        } else {
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        // 👇 forza lo scroll all'inizio della pagina
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);


    // ✅ carica contenuto da Nostr
    useEffect(() => {
        if (!params?.id) return;
        if (!loggedUser) return;

        const relayUrls = RELAYS.map((r) => r.url);

        const sub = pool.sub(relayUrls, [{ ids: [params.id as string] }]);

        (sub as any).on("event", (event: any) => {
            console.log("Evento ricevuto:", event);

            setItem({
                id: event.id,
                title:
                    event.tags.find((t: string[]) => t[0] === "title")?.[1] ||
                    "Senza titolo",
                fullContent: event.content,
                priceSats: parseInt(
                    event.tags.find((t: string[]) => t[0] === "price_sats")?.[1] || "0",
                    10
                ),
                authorNpub: event.pubkey,
                relays: RELAYS.map((r) => r.url),
            });

            (sub as any).unsub();
        });

        sub.on("eose", () => {
            console.log("🚫 Nessun evento trovato per questo ID");
        });

        return () => sub.unsub();
    }, [params?.id, loggedUser]);

    if (!loggedUser) return null;

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600 animate-pulse">
                ⏳ Caricamento contenuto...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-6 py-10 animate-fadeIn">
            <div className="max-w-4xl mx-auto">
                {/* 🔙 Pulsante back */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white text-purple-600 rounded-lg shadow transition"
                >
                    <ArrowLeft size={18} />
                    Torna indietro
                </button>

                {/* Titolo */}
                <div className="mb-6 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">
                        {item.title}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Autore: {item.authorNpub.slice(0, 12)}…
                    </p>
                </div>

                {/* Card contenuto */}
                <div className="bg-white/90 rounded-2xl shadow-lg p-6 backdrop-blur-sm">
                    <ContentCard
                        item={item}
                        loggedUser={loggedUser}
                        isAuthor={loggedUser?.npub === item.authorNpub}
                    />
                </div>
            </div>
        </div>
    );
}
