import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import https from 'https';

export async function POST(req: Request) {
    try {
        const { receiverId, amount, memo } = await req.json();

        console.log("📥 [CreateInvoice] Body ricevuto:", { receiverId, amount, memo });

        // Carico configurazione nodi
        const configPath = path.join(process.cwd(), 'nodes-config.json');
        if (!fs.existsSync(configPath)) {
            console.error("❌ [CreateInvoice] File nodes-config.json non trovato");
            return NextResponse.json({ error: 'Config file mancante' }, { status: 500 });
        }

        const nodes = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log("📜 [CreateInvoice] Nodi caricati:", nodes.map((n: any) => n.name || n.pubkey));

        // ✅ Troviamo il nodo destinatario (anche con nostr_pubkey)
        const node = nodes.find((n: any) =>
            n.id?.toLowerCase() === receiverId?.toLowerCase() ||
            n.name?.toLowerCase() === receiverId?.toLowerCase() ||
            n.pubkey?.toLowerCase() === receiverId?.toLowerCase() ||
            n.nostr_pubkey?.toLowerCase() === receiverId?.toLowerCase()
        );

        if (!node) {
            console.error("❌ [CreateInvoice] Nodo non trovato per receiverId:", receiverId);
            return NextResponse.json({ error: 'Nodo non trovato' }, { status: 404 });
        }

        console.log("✅ [CreateInvoice] Nodo trovato:", node.name || node.pubkey);

        const url = `${node.host}/v1/invoices`;
        const payload = { value: amount, memo: memo || 'Zap payment' };

        // Creazione agent TLS con certificato del nodo
        const agent = new https.Agent({
            ca: node.tls_cert,
            rejectUnauthorized: false // Polar spesso richiede false
        });

        console.log("🌍 [CreateInvoice] Chiamata LND →", url);

        const res = await fetch(url, {
            method: 'POST',
            agent,
            headers: {
                'Grpc-Metadata-macaroon': node.macaroon,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log("📩 [CreateInvoice] Risposta LND:", res.status, res.statusText, text);

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to create invoice', details: text }, { status: res.status });
        }

        const data = JSON.parse(text);
        return NextResponse.json(data);

    } catch (err: any) {
        console.error("💥 [CreateInvoice] Errore:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
