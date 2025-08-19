'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { pool } from '../lib/nostr'
import { RELAYS } from '../lib/config'

interface Post {
    id: string
    title: string
    preview: string
    fullContent: string
    priceSats: number
    authorNpub: string
}

export default function Page() {
    const [loggedUser, setLoggedUser] = useState<any>(null)
    const [allContent, setAllContent] = useState<Post[]>([])

    useEffect(() => {
        const data = sessionStorage.getItem('loggedInUser')
        if (data) {
            setLoggedUser(JSON.parse(data))
        } else {
            window.location.href = '/login'
        }
    }, [])

    useEffect(() => {
        if (!loggedUser) return

        // 🔄 subscribe a tutti i relay
        const sub = pool.sub(RELAYS, [{ kinds: [30023], limit: 50 }])

        sub.on('event', (event) => {
            console.log('📥 Post ricevuto:', event)

            const titleTag = event.tags.find(t => t[0] === 'title')
            const priceTag = event.tags.find(t => t[0] === 'price_sats')

            const post: Post = {
                id: event.id,
                title: titleTag?.[1] || 'Senza titolo',
                preview: '🔒 Contenuto bloccato. Invia uno zap per sbloccare!',
                fullContent: event.content,
                priceSats: priceTag ? parseInt(priceTag[1]) : 0,
                authorNpub: event.pubkey,
            }

            setAllContent(prev => {
                if (prev.find(p => p.id === post.id)) return prev
                return [post, ...prev]
            })
        })

        sub.on('eose', () => {
            console.log('✅ Fine eventi storici')
        })

        return () => {
            sub.unsub()
        }
    }, [loggedUser])

    if (!loggedUser) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <section className="text-center py-14">
                <h1 className="text-5xl font-extrabold text-gray-800 drop-shadow mb-3">
                    ⚡ Benvenuto {loggedUser.node?.name || 'Utente'}!
                </h1>
                <p className="text-gray-600 text-lg">
                    Sblocca e crea contenuti esclusivi con Lightning ⚡
                </p>
            </section>

            <main className="max-w-5xl mx-auto px-6 pb-16">
                {allContent.length === 0 ? (
                    <p className="text-center text-gray-600">Nessun contenuto disponibile.</p>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {allContent.map(item => (
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
                    🔒 {item.priceSats} sats
                  </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
