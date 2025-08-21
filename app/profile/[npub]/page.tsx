"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { relayInit } from "nostr-tools"
import { RELAYS } from "../../../lib/config"

interface ProfileData {
    name?: string
    about?: string
    picture?: string
}

interface Post {
    id: string
    title: string
    preview: string
    priceSats: number
    relay: string
}

export default function ProfilePage() {
    const { npub } = useParams()
    const [profile, setProfile] = useState<ProfileData>({})
    const [authorPosts, setAuthorPosts] = useState<Post[]>([])

    useEffect(() => {
        if (!npub) return

        const activeSubs: any[] = []

        RELAYS.forEach(async ({ url }) => {
            const relay = relayInit(url)
            await relay.connect()

            // 🔹 profilo kind:0
            const subProfile = relay.sub([{ kinds: [0], authors: [npub as string], limit: 1 }])
            subProfile.on("event", (event) => {
                try {
                    const metadata = JSON.parse(event.content)
                    setProfile({
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                    })
                } catch (e) {
                    console.warn("Errore parsing metadata", e)
                }
            })
            activeSubs.push(subProfile)

            // 🔹 post kind:30023
            const subPosts = relay.sub([{ kinds: [30023], authors: [npub as string], limit: 50 }])
            subPosts.on("event", (event) => {
                const titleTag = event.tags.find((t) => t[0] === "title")
                const priceTag = event.tags.find((t) => t[0] === "price_sats")

                const post: Post = {
                    id: event.id,
                    title: titleTag?.[1] || "Senza titolo",
                    preview: event.content.slice(0, 100) + "...",
                    priceSats: priceTag ? parseInt(priceTag[1]) : 0,
                    relay: url,
                }

                setAuthorPosts((prev) => {
                    if (prev.find((p) => p.id === post.id && p.relay === url)) return prev
                    return [post, ...prev]
                })
            })
            activeSubs.push(subPosts)
        })

        return () => activeSubs.forEach((s) => s.unsub())
    }, [npub])

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-10">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
                Profilo Autore ⚡
            </h1>
            <p className="text-gray-600 mb-6 font-mono break-all">npub: {npub}</p>

            {/* Foto + dati profilo */}
            {profile.picture && (
                <img
                    src={profile.picture}
                    alt="Foto profilo"
                    className="w-32 h-32 rounded-full shadow mb-4"
                />
            )}
            <h2 className="text-2xl font-bold">{profile.name || "Anonimo"}</h2>
            <p className="text-gray-600 mb-10">{profile.about}</p>

            {/* Lista post */}
            {authorPosts.length === 0 ? (
                <p className="text-gray-500">Nessun contenuto trovato.</p>
            ) : (
                <div className="grid gap-6 w-full max-w-3xl">
                    {authorPosts.map((item) => (
                        <div
                            key={item.id + item.relay}
                            className="border bg-white rounded-lg shadow p-6 text-left"
                        >
                            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
                            <p className="text-gray-600">{item.preview}</p>
                            <p className="mt-2 text-sm text-gray-500">
                                Prezzo: {item.priceSats} sats
                            </p>
                            <p className="mt-1 text-xs text-gray-400">Relay: {item.relay}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
