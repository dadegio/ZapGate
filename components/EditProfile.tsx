// components/EditProfile.tsx

'use client';

import { useState } from 'react';
import { relayInit } from 'nostr-tools';
import { RELAYS } from '../lib/config';

interface ProfileForm {
    name: string;
    about: string;
    picture: string;
    lud16: string;
}

export default function EditProfile({
                                        initial,
                                        onSaved,
                                    }: {
    initial: ProfileForm;
    onSaved?: (form: ProfileForm) => void; // ✅ callback
}) {
    const [form, setForm] = useState<ProfileForm>(initial);
    const [loading, setLoading] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            if (!window.nostr) {
                console.error('❌ Estensione Nostr non trovata (Alby, Nos2x, ecc.)');
                return;
            }

            setLoading(true);

            // ✍️ Evento kind:0
            const event = {
                kind: 0,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: JSON.stringify(form),
                pubkey: await window.nostr.getPublicKey(),
            };

            const signedEvent = await window.nostr.signEvent(event);

            // 🚀 Pubblica su tutti i relay
            for (const { url } of RELAYS) {
                try {
                    const relay = relayInit(url);
                    await relay.connect();
                    await relay.publish(signedEvent);
                    console.log(`✅ Evento pubblicato su ${url}`);
                } catch (err) {
                    console.error(`❌ Errore su ${url}:`, err);
                }
            }

            // 📦 Salva in eventHistory
            const current = JSON.parse(localStorage.getItem('eventHistory') || '[]');
            current.push({
                time: Date.now(),
                kind: signedEvent.kind,
                event: signedEvent,
            });
            localStorage.setItem('eventHistory', JSON.stringify(current));

            // ✅ chiama callback per chiudere il form
            if (onSaved) onSaved(form);
        } catch (e) {
            console.error('❌ Errore salvataggio profilo:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow space-y-4">
            <h2 className="text-xl font-bold">Modifica Profilo</h2>

            <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nome"
                className="w-full border p-2 rounded"
            />
            <textarea
                name="about"
                value={form.about}
                onChange={handleChange}
                placeholder="Descrizione"
                className="w-full border p-2 rounded"
            />
            <input
                type="text"
                name="picture"
                value={form.picture}
                onChange={handleChange}
                placeholder="URL immagine profilo"
                className="w-full border p-2 rounded"
            />
            <input
                type="text"
                name="lud16"
                value={form.lud16}
                onChange={handleChange}
                placeholder="⚡ Lightning Address (es. davide@ln.tips)"
                className="w-full border p-2 rounded"
            />

            <button
                onClick={handleSave}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded shadow w-full"
            >
                {loading ? '⏳ Salvataggio...' : '💾 Salva Profilo'}
            </button>
        </div>
    );
}
