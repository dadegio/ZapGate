'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
    const [nodes, setNodes] = useState<any[]>([]);
    const [selected, setSelected] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [serverUp, setServerUp] = useState<boolean>(true);

    useEffect(() => {
        const existingUser = sessionStorage.getItem('loggedInUser');
        if (existingUser) {
            window.location.href = '/';
            return;
        }

        fetch('/api/nodes')
            .then(res => {
                if (!res.ok) throw new Error('Server non disponibile');
                return res.json();
            })
            .then(data => {
                setNodes(data);
                setServerUp(true);
            })
            .catch(err => {
                console.error('❌ Errore caricamento nodi:', err);
                setServerUp(false);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleLogin = () => {
        const user = nodes.find(n => n.id === selected);
        if (!user) return;
        sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        window.location.href = '/';
    };

    if (loading) {
        return <p className="text-center mt-20 animate-pulse text-white">⏳ Verifica server...</p>;
    }

    if (!serverUp) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
                <h1 className="text-4xl font-bold mb-4">⚠️ Server offline</h1>
                <p className="text-gray-400">Avvia i nodi e riprova.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 text-center px-6">
            {/* Fulmine decorativo */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white/40 text-[12rem] select-none pointer-events-none">
                ⚡
            </div>

            {/* Contenuto principale */}
            <h1 className="text-6xl font-extrabold text-gray-800 drop-shadow-lg mb-6 z-10">
                ZapGate
            </h1>
            <p className="text-gray-700 mb-12 text-lg z-10">
                Sblocca contenuti con Lightning ⚡
            </p>

            <div className="w-full max-w-md z-10">
                <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-purple-400"
                >
                    <option value="">-- scegli un nodo --</option>
                    {nodes.map(node => (
                        <option key={node.id} value={node.id}>
                            {node.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleLogin}
                    disabled={!selected}
                    className="w-full bg-purple-400 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition transform hover:scale-[1.02]"
                >
                    Entra
                </button>
            </div>
        </div>
    );
}
