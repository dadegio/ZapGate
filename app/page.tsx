'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { relayInit, type Sub } from 'nostr-tools'
import { RELAYS } from '../lib/config'

interface Post {
    id: string
    title: string
    preview: string
    fullContent: string
    priceSats: number
    authorNpub: string
    relays: string[]
}

interface ProfileData {
    name?: string
    about?: string
    picture?: string
    lud16?: string
}

export default function Page() {
    const [loggedUser, setLoggedUser] = useState<any>(null)
    const [profile, setProfile] = useState<ProfileData>({})
    const [allContent, setAllContent] = useState<Post[]>([])
    const [selectedRelay, setSelectedRelay] = useState<string>('all')
    const [unlockedIds, setUnlockedIds] = useState<string[]>([])

    // Recupera utente loggato
    useEffect(() => {
        const data = sessionStorage.getItem('loggedInUser')
        if (data) {
            setLoggedUser(JSON.parse(data))
        } else {
            window.location.href = '/login'
        }
    }, [])

    // Carica contenuti sbloccati da localStorage
    useEffect(() => {
        const unlocked = JSON.parse(localStorage.getItem('unlockedContent') || '[]')
        setUnlockedIds(unlocked)
    }, [])

    // 🔹 Recupera profilo kind:0 dell’utente loggato
    useEffect(() => {
        if (!loggedUser?.npub) return
        const activeSubs: Sub[] = []

        RELAYS.forEach(async ({ url }) => {
            const relay = relayInit(url)
            await relay.connect()

            const sub = relay.sub([{ kinds: [0], authors: [loggedUser.npub], limit: 1 }])
            sub.on('event', (event) => {
                try {
                    const metadata = JSON.parse(event.content)
                    setProfile({
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                        lud16: metadata.lud16,
                    })
                } catch (e) {
                    console.warn('Errore parsing metadata kind:0', e)
                }
            })
            activeSubs.push(sub)
        })

        return () => activeSubs.forEach((s) => s.unsub())
    }, [loggedUser?.npub])

    // 🔹 Carica post kind:30023
    useEffect(() => {
        if (!loggedUser) return
        setAllContent([])

        const relaysToUse =
            selectedRelay === 'all' ? RELAYS.map((r) => r.url) : [selectedRelay]

        const activeSubs: Sub[] = []

        relaysToUse.forEach(async (url) => {
            const relay = relayInit(url)
            await relay.connect()

            const sub = relay.sub([{ kinds: [30023], limit: 50 }])

            sub.on('event', (event) => {
                const titleTag = event.tags.find((t) => t[0] === 'title')
                const priceTag = event.tags.find((t) => t[0] === 'price_sats')

                setAllContent((prev) => {
                    const existing = prev.find((p) => p.id === event.id)

                    if (existing) {
                        // già esiste → aggiorna relay se mancante
                        if (!existing.relays.includes(url)) {
                            return prev.map((p) =>
                                p.id === event.id ? { ...p, relays: [...p.relays, url] } : p
                            )
                        }
                        return prev
                    }

                    // nuovo post
                    const previewText = event.content
                        .split(' ')
                        .slice(0, 20)
                        .join(' ')
                        .concat('...')

                    const post: Post = {
                        id: event.id,
                        title: titleTag?.[1] || 'Senza titolo',
                        preview: previewText,
                        fullContent: event.content,
                        priceSats: priceTag ? parseInt(priceTag[1]) : 0,
                        authorNpub: event.pubkey,
                        relays: [url],
                    }

                    return [post, ...prev]
                })
            })

            sub.on('eose', () => console.log(`✅ Fine eventi storici da ${url}`))

            activeSubs.push(sub)
        })

        return () => activeSubs.forEach((s) => s.unsub())
    }, [loggedUser, selectedRelay])

    if (!loggedUser) return null

    // ✅ filtro finale: escludi i post creati dall'utente stesso
    const filteredContent =
        selectedRelay === 'all'
            ? allContent
            : allContent.filter((item) => item.relays.includes(selectedRelay))

    const visibleContent = filteredContent.filter(
        (item) => item.authorNpub !== loggedUser.npub
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <section className="text-center py-14">
                <h1 className="text-5xl font-extrabold text-gray-800 drop-shadow mb-3">
                    ⚡ Benvenuto {profile.name || loggedUser.name || 'Utente'}!
                </h1>
                <p className="text-gray-600 text-lg">
                    Sblocca e crea contenuti esclusivi con Lightning ⚡
                </p>
            </section>

            <main className="max-w-5xl mx-auto px-6 pb-16">
                {/* ✅ Filtro relay */}
                <div className="mb-6">
                    <label className="mr-2 font-medium">Filtro relay:</label>
                    <select
                        value={selectedRelay}
                        onChange={(e) => setSelectedRelay(e.target.value)}
                        className="border px-3 py-1 rounded"
                    >
                        <option value="all">Tutti</option>
                        {RELAYS.map((r) => (
                            <option key={r.url} value={r.url}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>

                {visibleContent.length === 0 ? (
                    <p className="text-center text-gray-600">Nessun contenuto disponibile.</p>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {visibleContent.map((item) => {
                            const isUnlocked = unlockedIds.includes(item.id)

                            return (
                                <Link key={item.id} href={`/content/${item.id}`}>
                                    <div className="bg-white/90 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition transform p-6 cursor-pointer relative overflow-hidden backdrop-blur-sm">
                                        <div className="absolute right-4 top-4 text-purple-200 text-5xl opacity-30">
                                            ⚡
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-3">
                                            {item.title}
                                        </h2>
                                        <p className="text-gray-600 line-clamp-2">{item.preview}</p>
                                        <span className="inline-block mt-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-semibold px-4 py-1 rounded-full shadow">
                      {isUnlocked ? '✅ Sbloccato' : `🔒 ${item.priceSats} sats`}
                    </span>
                                        {/* mostra la lista relay */}
                                        <div className="text-xs text-gray-500 mt-2">
                                            {item.relays.join(', ')}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
