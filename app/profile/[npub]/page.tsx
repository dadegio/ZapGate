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
        // Immagini
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

        // Video
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

        // YouTube
        if (word.includes("youtube.com") || word.includes("youtu.be")) {
            const embedUrl = word.includes("watch?v=")
                ? word.replace("watch?v=", "embed/")
                : word.replace("youtu.be/", "youtube.com/embed/");
            return (
                <div
                    key={i}
                    className="relative my-2 w-full"
                    style={{ paddingTop: "56.25%" }}
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

        // Testo normale (con break-words)
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

            // 🔹 profilo kind:0
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

            // 🔹 post kind:30023
            const subPosts = relay.sub([
                { kinds: [30023], authors: [npub as string], limit: 50 },
            ]);
            subPosts.on("event", (event) => {
                const titleTag = event.tags.find((t) => t[0] === "title");
                const priceTag = event.tags.find((t) => t[0] === "price_sats");

                const post: Post = {
                    id: event.id,
                    title: titleTag?.[1] || "Senza titolo",
                    preview: event.content, // 👉 usiamo tutto il contenuto, lo renderizziamo
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
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-10">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-10">Profilo ⚡</h1>

            {/* Layout a 2 colonne */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
                {/* Colonna profilo */}
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4 text-center">
                    {profile.picture && (
                        <img
                            src={profile.picture}
                            alt="Foto profilo"
                            className="w-32 h-32 mx-auto rounded-full shadow"
                        />
                    )}

                    <h2 className="text-2xl font-bold text-gray-800">
                        {profile.name || "Anonimo"}
                    </h2>

                    {profile.about && (
                        <p className="text-gray-600 italic whitespace-pre-line">
                            {profile.about}
                        </p>
                    )}

                    <div className="text-sm text-gray-500 break-all">
                        <span className="font-semibold">npub:</span> {npub}
                    </div>

                    {profile.lud16 && (
                        <p className="mt-2 text-purple-600 font-mono break-all">
                            ⚡ {profile.lud16}
                        </p>
                    )}

                    {loggedUser?.npub === npub && (
                        <div className="pt-4">
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
                                >
                                    ✏️ Modifica Profilo
                                </button>
                            ) : (
                                <EditProfile
                                    initial={{
                                        name: profile.name || "",
                                        about: profile.about || "",
                                        picture: profile.picture || "",
                                        lud16: profile.lud16 || "",
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Colonna post */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4">Post creati</h3>

                    {authorPosts.length === 0 ? (
                        <p className="text-gray-500">Nessun contenuto trovato.</p>
                    ) : (
                        <div className="grid gap-6">
                            {authorPosts.map((item) => (
                                <Link key={item.id} href={`/content/${item.id}`}>
                                    <div className="cursor-pointer border bg-gray-50 rounded-lg shadow p-4 text-left hover:bg-gray-100 transition">
                                        <h2 className="text-lg font-bold mb-1">{item.title}</h2>
                                        <div className="text-gray-600 text-sm line-clamp-3 break-words">
                                            {renderPreview(item.preview)}
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Prezzo: {item.priceSats} sats
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
        </div>
    );
}
