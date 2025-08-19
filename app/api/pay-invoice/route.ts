import { NextResponse } from 'next/server';
import fs from 'fs';
import https from 'https';

export async function POST(request: Request) {
    console.log('📡 [PayInvoice] API chiamata');

    try {
        const { payerId, paymentRequest } = await request.json();
        console.log('📥 [PayInvoice] Body ricevuto:', { payerId, paymentRequest });

        if (!payerId || !paymentRequest) {
            console.error("❌ [PayInvoice] Parametri mancanti");
            return NextResponse.json(
                { error: 'payerId o paymentRequest mancanti' },
                { status: 400 }
            );
        }

        // Carica nodi
        const nodesPath = process.cwd() + '/nodes-config.json';
        const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf-8'));

        // ✅ Trova il nodo mittente (anche con nostr_pubkey)
        const payerNode = nodes.find(
            (n: any) =>
                n.pubkey?.toLowerCase() === payerId.toLowerCase() ||
                n.name?.toLowerCase() === payerId.toLowerCase() ||
                n.nostr_pubkey?.toLowerCase() === payerId.toLowerCase()
        );

        if (!payerNode) {
            console.error('❌ [PayInvoice] Nodo mittente non trovato per id:', payerId);
            return NextResponse.json({ error: 'Nodo mittente non trovato' }, { status: 404 });
        }

        console.log("✅ [PayInvoice] Nodo trovato:", payerNode.name || payerNode.pubkey);

        // Setup chiamata LND
        const agent = new https.Agent({
            ca: payerNode.tls_cert,
            rejectUnauthorized: false, // Polar spesso richiede false
        });

        const url = `${payerNode.host}/v1/channels/transactions`;
        console.log("🌍 [PayInvoice] Chiamata LND →", url);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Grpc-Metadata-macaroon': payerNode.macaroon,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ payment_request: paymentRequest }),
            agent,
        } as any);

        const text = await res.text();
        console.log("📩 [PayInvoice] Risposta LND:", res.status, res.statusText, text);

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Errore pagamento invoice', details: text },
                { status: res.status }
            );
        }

        const data = JSON.parse(text);
        return NextResponse.json(data);

    } catch (err: any) {
        console.error("💥 [PayInvoice] Errore:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
