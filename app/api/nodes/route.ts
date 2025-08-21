// app/api/nodes/route.ts

import { NextResponse } from 'next/server';
import nodesConfig from '../../../nodes-config.json';

export async function GET() {
    try {
        // Restituiamo solo i dati pubblici (nostr_pubkey)
        const publicNodes = nodesConfig.map((n: any) => ({
            nostr_pubkey: n.nostr_pubkey,   // identificativo pubblico
        }));

        return NextResponse.json(publicNodes);
    } catch (err) {
        console.error('❌ [Nodes] Errore caricamento nodi:', err);
        return NextResponse.json({ error: 'Impossibile caricare nodi' }, { status: 500 });
    }
}
