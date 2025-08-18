// app/api/nodes/route.ts
import { NextResponse } from 'next/server';
import nodesConfig from '../../../nodes-config.json';

export async function GET() {
    try {
        // Prendi solo i dati pubblici
        const publicNodes = nodesConfig.map((n: any) => ({
            id: n.pubkey,
            name: n.name,
            pubkey: n.pubkey,
            nostr_pubkey: n.nostr_pubkey // 👈 aggiungi questo
        }));


        return NextResponse.json(publicNodes);
    } catch (err) {
        console.error('Errore caricamento nodi:', err);
        return NextResponse.json({ error: 'Impossibile caricare nodi' }, { status: 500 });
    }
}
