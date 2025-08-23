"use client"

import {useEffect} from "react";

export default function AboutPage() {

    useEffect(() => {
        // 👇 forza lo scroll all'inizio della pagina
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);


    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 px-6 py-16">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-10 animate-fadeIn">
                <h1 className="text-5xl font-extrabold text-center text-gray-800 mb-8">
                    📖 La storia dell’app
                </h1>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                    Questa piattaforma nasce dall’idea di unire <strong>Nostr</strong> ⚡ e
                    la <strong>Lightning Network</strong> per creare un ecosistema
                    decentralizzato di contenuti.
                </p>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                    Gli utenti possono <strong>creare, vendere e sbloccare</strong>{" "}
                    contenuti digitali in modo sicuro, senza intermediari e con il potere
                    dei micropagamenti istantanei.
                </p>

                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                    La missione è semplice: <em>dare valore ai contenuti e libertà agli
                    utenti</em>.
                </p>

                <p className="text-lg text-gray-700 leading-relaxed">
                    Ogni post pubblicato, ogni zap inviato e ogni profilo creato diventa
                    parte della storia di un social più libero, aperto e resiliente. 🚀
                </p>
            </div>
        </div>
    );
}
