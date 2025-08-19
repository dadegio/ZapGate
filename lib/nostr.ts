// lib/nostr.ts
import {
    SimplePool,
    getPublicKey,
    getEventHash,
    signEvent,
    type Event as NostrEvent,
} from 'nostr-tools'
import { RELAYS } from './config'

// Pool condiviso
export const pool = new SimplePool()

/**
 * Utils: Uint8Array -> hex string
 */
function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

/**
 * Genera una secret key random (Uint8Array)
 */
export function generateSecretKey(): Uint8Array {
    const sk = new Uint8Array(32)
    crypto.getRandomValues(sk)
    return sk
}

/**
 * Crea e firma un evento Nostr
 */
export function createEvent(
    kind: number,
    content: string,
    tags: string[][] = [],
    sk?: Uint8Array
): NostrEvent {
    const secret = sk || generateSecretKey()
    const skHex = toHex(secret)            // ✅ conversione in hex
    const pubkey = getPublicKey(skHex)

    const ev = {
        kind,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content,
    }

    return {
        ...ev,
        id: getEventHash(ev),
        sig: signEvent(ev, skHex),           // ✅ usa hex, non Uint8Array
    }
}

/**
 * Crea una Zap Request (kind 9734)
 */
export function createZapRequest({
                                     senderPubkey,
                                     receiverPubkey,
                                     amount,
                                     noteId,
                                     sk,
                                 }: {
    senderPubkey: string
    receiverPubkey: string
    amount: number
    noteId?: string
    sk?: Uint8Array
}): NostrEvent {
    const tags: string[][] = [
        ['p', receiverPubkey],
        ['amount', String(amount)],
        ['from', senderPubkey],
    ]

    if (noteId) tags.push(['e', noteId])

    return createEvent(9734, `Zap request of ${amount} sats`, tags, sk)
}

/**
 * Crea una Zap Receipt (kind 9735)
 */
export function createZapReceipt({
                                     receiverPubkey,
                                     senderPubkey,
                                     amount,
                                     zapRequestId,
                                     sk,
                                 }: {
    receiverPubkey: string
    senderPubkey: string
    amount: number
    zapRequestId: string
    sk?: Uint8Array
}): NostrEvent {
    const tags: string[][] = [
        ['p', receiverPubkey],
        ['amount', String(amount)],
        ['e', zapRequestId],
        ['from', senderPubkey],
    ]

    return createEvent(9735, `Zap receipt of ${amount} sats`, tags, sk)
}

/**
 * Pubblica un evento su tutti i relay
 */
export async function publishEvent(ev: NostrEvent): Promise<void> {
    let signed = ev;

    // se ho NIP-07 uso quello
    if ((window as any).nostr) {
        signed = await (window as any).nostr.signEvent(ev);
    } else {
        console.warn("⚠ Nessun provider nostr (NIP-07), uso sk random");
        // fallback: firma locale
        signed.sig = signEvent(ev, ""); // se hai secretKey
    }

    const pubs = pool.publish(RELAYS, signed);
    await Promise.all(pubs);
}

// 🔢 Conta il numero di zapReceipt (9735) legati a un contenuto
export async function countPurchases(itemId: string): Promise<number> {
    return new Promise((resolve) => {
        let count = 0;
        const sub = pool.sub(
            RELAYS,
            [{ kinds: [9735], "#e": [itemId] }]
        );

        sub.on("event", () => {
            count++;
        });

        sub.on("eose", () => {
            sub.unsub();
            resolve(count);
        });
    });
}

/**
 * Crea un evento di eliminazione (kind 5)
 */
export function createDeleteEvent(
    eventId: string,
    reason = "deleted",
    sk?: Uint8Array
): NostrEvent {
    const tags = [["e", eventId], ["reason", reason]];
    return createEvent(5, reason, tags, sk);
}