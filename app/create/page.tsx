'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RELAYS } from '../../lib/config'
import { relayInit } from 'nostr-tools'

export default function CreatePage() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [fullContent, setFullContent] = useState('')
    const [priceSats, setPriceSats] = useState(0)
    const [loggedUser, setLoggedUser] = useState<any>(null)
    const [selectedRelays, setSelectedRelays] = useState<string[]>([])
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        const stored = sessionStorage.getItem('loggedInUser')
        if (stored) {
            setLoggedUser(JSON.parse(stored))
        } else {
            router.push('/login')
        }
    }, [router])

    const toggleRelay = (url: string) => {
        setSelectedRelays(prev =>
            prev.includes(url) ? prev.filter(r => r !== url) : [...prev, url]
        )
    }

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setFadeOut(false)

        setTimeout(() => setFadeOut(true), 2200) // inizia a dissolvere
        setTimeout(() => setToast(null), 3000)   // rimuovi dopo 3s
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!loggedUser) return

        try {
            if (!window.nostr) {
                showToast('❌ Nessun provider Nostr trovato (Alby, nos2x, ecc.)', 'error')
                return
            }

            const pubkey = await window.nostr.getPublicKey()
            const eventTemplate = {
                kind: 30023,
                pubkey,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['title', title],
                    ['price_sats', String(priceSats)],
                    ['ln_pubkey', loggedUser.node?.pubkey || ''],
                ],
                content: fullContent,
            }

            const signedEvent = await window.nostr.signEvent(eventTemplate)

            for (const url of selectedRelays) {
                const relay = relayInit(url)
                await relay.connect()
                console.log(`✅ Pubblico su ${url}`)
                relay.publish(signedEvent)
            }

            showToast('✅ Post pubblicato su Nostr!', 'success')
            setTimeout(() => router.push('/'), 1500)
        } catch (err) {
            console.error('❌ Errore pubblicazione:', err)
            showToast('Errore pubblicazione: ' + (err as any).message, 'error')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 px-6 py-12">
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl p-10 w-full max-w-2xl animate-fadeIn">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
                    ✍️ Crea nuovo articolo
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Titolo */}
                    <input
                        type="text"
                        placeholder="Titolo accattivante ✨"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />

                    {/* Contenuto */}
                    <textarea
                        placeholder="Scrivi qui il tuo contenuto completo..."
                        value={fullContent}
                        onChange={e => setFullContent(e.target.value)}
                        required
                        rows={6}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />

                    {/* Prezzo */}
                    <input
                        type="number"
                        placeholder="Prezzo in sats ⚡"
                        value={priceSats}
                        onChange={e => setPriceSats(Number(e.target.value))}
                        required
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />

                    {/* Relay */}
                    <fieldset className="space-y-3">
                        <legend className="font-semibold text-gray-700">Seleziona i relay:</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {RELAYS.map(r => (
                                <button
                                    key={r.url}
                                    type="button"
                                    onClick={() => toggleRelay(r.url)}
                                    className={`px-4 py-2 rounded-xl border shadow-sm transition ${
                                        selectedRelays.includes(r.url)
                                            ? 'bg-purple-500 text-white border-purple-600'
                                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                    }`}
                                >
                                    {r.name}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {/* Pulsante submit */}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition transform hover:scale-[1.02]"
                    >
                        🚀 Pubblica il tuo contenuto
                    </button>
                </form>
            </div>

            {/* ✅ Toast centrato e con fadeOut */}
            {toast && (
                <div className="fixed inset-0 flex items-center justify-center z-[9999]">
                    <div
                        className={`px-6 py-4 rounded-xl shadow-2xl text-white font-semibold
              ${fadeOut ? 'animate-fadeOut' : 'animate-fadeIn'}
              ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    )
}
