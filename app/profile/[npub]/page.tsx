"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { relayInit } from "nostr-tools";
import { RELAYS } from "../../../lib/config";
import EditProfile from "../../../components/EditProfile";

interface ProfileData {
    name?: string;
    about?: string;
    picture?: string;
    lud16?: string;
}

interface Post {
    id: string;
    title: string;
    preview: string;
    priceSats: number;
    relays: string[];
}

// 🔹 Renderer per testo / immagini / video
function renderPreview(content: string) {
    return content.split(/\s+/).map((word, i) => {
        if (word.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
            return (
                <img
                    key={i}
                    src={word}
                    alt="preview"
                    className="my-2 max-h-40 rounded-lg mx-auto object-contain shadow"
                />
            );
        }

        if (word.match(/\.(mp4|webm)$/i)) {
            return (
                <video
                    key={i}
                    src={word}
                    controls
                    className="my-2 max-h-48 w-full rounded-lg shadow"
                />
            );
        }

        if (word.includes("youtube.com") || word.includes("youtu.be")) {
            const embedUrl = word.includes("watch?v=")
                ? word.replace("watch?v=", "embed/")
                : word.replace("youtu.be/", "youtube.com/embed/");
            return (
                <div
                    key={i}
                    className="relative my-2 w-full"
                    style={{ paddingTop: "42.85%" }} // 21:9
                >
                    <iframe
                        src={embedUrl}
                        className="absolute top-0 left-0 w-full h-full rounded-lg shadow"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        return (
            <span key={i} className="break-words">
        {word + " "}
      </span>
        );
    });
}

export default function ProfilePage() {
    const { npub } = useParams();
    const [profile, setProfile] = useState<ProfileData>({});
    const [authorPosts, setAuthorPosts] = useState<Post[]>([]);
    const [loggedUser, setLoggedUser] = useState<any>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const data = sessionStorage.getItem("loggedInUser");
        if (data) setLoggedUser(JSON.parse(data));
    }, []);

    useEffect(() => {
        if (!npub) return;

        const activeSubs: any[] = [];

        RELAYS.forEach(async ({ url }) => {
            const relay = relayInit(url);
            await relay.connect();

            // profilo kind:0
            const subProfile = relay.sub([
                { kinds: [0], authors: [npub as string], limit: 1 },
            ]);
            subProfile.on("event", (event) => {
                try {
                    const metadata = JSON.parse(event.content);
                    setProfile({
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                        lud16: metadata.lud16,
                    });
                } catch (e) {
                    console.warn("Errore parsing metadata", e);
                }
            });
            activeSubs.push(subProfile);

            // post kind:30023
            const subPosts = relay.sub([
                { kinds: [30023], authors: [npub as string], limit: 50 },
            ]);
            subPosts.on("event", (event) => {
                const titleTag = event.tags.find((t) => t[0] === "title");
                const priceTag = event.tags.find((t) => t[0] === "price_sats");

                const post: Post = {
                    id: event.id,
                    title: titleTag?.[1] || "Senza titolo",
                    preview: event.content,
                    priceSats: priceTag ? parseInt(priceTag[1]) : 0,
                    relays: [url],
                };

                setAuthorPosts((prev) => {
                    const existing = prev.find((p) => p.id === post.id);
                    if (existing) {
                        return prev.map((p) =>
                            p.id === post.id
                                ? { ...p, relays: Array.from(new Set([...p.relays, url])) }
                                : p
                        );
                    }
                    return [post, ...prev];
                });
            });
            activeSubs.push(subPosts);
        });

        return () => activeSubs.forEach((s) => s.unsub());
    }, [npub]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 px-6 py-12">
            {/* Hero profilo */}
            <div className="text-center mb-12">
                <div className="inline-block bg-white/80 rounded-3xl shadow-xl p-8 relative">
                    {profile.picture && (
                        <div className="w-36 h-36 mx-auto mb-4 rounded-full border-4 border-purple-400 shadow overflow-hidden">
                            <img
                                src={profile.picture}
                                alt="Foto profilo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <h1 className="text-3xl font-extrabold text-gray-900">
                        {profile.name || "Anonimo"}
                    </h1>

                    {profile.about && (
                        <p className="mt-3 text-gray-700 max-w-lg mx-auto italic whitespace-pre-line">
                            {profile.about}
                        </p>
                    )}

                    {profile.lud16 && (
                        <p className="mt-3 text-purple-600 font-mono break-all">
                            ⚡ {profile.lud16}
                        </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500 break-all">
                        npub: {npub}
                    </p>

                    {loggedUser?.npub === npub && (
                        <div className="pt-4">
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-5 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
                                >
                                    ✏️ Modifica Profilo
                                </button>
                            ) : (
                                <EditProfile
                                    initial={{
                                        name: profile.name || '',
                                        about: profile.about || '',
                                        picture: profile.picture || '',
                                        lud16: profile.lud16 || '',
                                    }}
                                    onSaved={(updated) => {
                                        setProfile(updated);   // aggiorna subito i dati a schermo
                                        setEditing(false);     // chiude il form
                                        // 👉 qui puoi aggiungere showToast("✅ Profilo aggiornato con successo!");
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Post creati */}
            <div className="max-w-5xl mx-auto bg-white/90 rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6">📚 Post creati</h3>

                {authorPosts.length === 0 ? (
                    <p className="text-gray-500">Nessun contenuto trovato.</p>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {authorPosts.map((item) => (
                            <Link key={item.id} href={`/content/${item.id}`}>
                                <div className="cursor-pointer rounded-xl border bg-gray-50 shadow hover:shadow-xl transition transform hover:-translate-y-1 hover:scale-[1.01] p-5">
                                    <h2 className="text-lg font-bold text-gray-800 mb-2">
                                        {item.title}
                                    </h2>
                                    <div className="text-gray-600 text-sm line-clamp-3 break-words">
                                        {renderPreview(item.preview)}
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-purple-600">
                                        🔒 {item.priceSats} sats
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400 break-all">
                                        Relay: {item.relays.join(", ")}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
