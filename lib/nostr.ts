import {
    SimplePool,
    getPublicKey,
    getEventHash,
    signEvent,
    type Event as NostrEvent,
} from 'nostr-tools'

import { Event } from "nostr-tools";
import { RELAYS } from './config'

// Pool condiviso
export const pool = new SimplePool()

// 🔗 Utility: array di soli URL (stringhe)
const relayUrls = RELAYS.map(r => r.url)

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
        ["p", receiverPubkey],
        ["payer", senderPubkey], // 👈 non più "from"
        ["amount", String(amount)],
        ["e", zapRequestId],
    ];

    return createEvent(9735, `Zap receipt of ${amount} sats`, tags, sk)
}


/**
 * Pubblica un evento su tutti i relay
 */
export async function publishEvent(ev: NostrEvent, skHex?: string): Promise<void> {
    let signed = ev;

    if (skHex) {
        // ✅ Firma manuale, così non perdiamo i tag
        signed.sig = signEvent(ev, skHex);
    } else if ((window as any).nostr) {
        // fallback: se non hai la tua privkey, chiedi al provider
        signed = await (window as any).nostr.signEvent(ev);
    } else {
        console.warn("⚠ Nessun provider nostr (NIP-07), uso sk random");
        signed.sig = signEvent(ev, "");
    }

    console.log("📤 Pubblico evento firmato:", JSON.stringify(signed, null, 2));

    const pubs = pool.publish(relayUrls, signed);
    await Promise.all(pubs);
}

export async function countActivePurchases(
    postId: string,
    relays: string[]
): Promise<number> {
    return new Promise((resolve) => {
        const lastEvent: Record<string, NostrEvent> = {}

        const sub = pool.sub(relays, [{ kinds: [9735, 9736], "#e": [postId] }])

        sub.on("event", (event: NostrEvent) => {
            console.log("👀 Evento visto da countActivePurchases:", event)

            const payer = event.tags.find((t) => t[0] === "payer")?.[1]
            if (!payer) {
                console.log("⚠ Nessun payer in questo evento:", event)
                return
            }

            const prev = lastEvent[payer]
            if (!prev || event.created_at > prev.created_at) {
                console.log(`✅ Aggiorno ultimo evento per ${payer} → kind ${event.kind}`)
                lastEvent[payer] = event
            }
        })

        sub.on("eose", () => {
            console.log("🔚 EOSE raggiunto, lastEvent:", lastEvent)
            const stillActive = Object.values(lastEvent).filter(
                (ev) => ev.kind === 9735
            )
            console.log("📊 Active purchases conteggiati:", stillActive.length)
            resolve(stillActive.length)
            sub.unsub()
        })
    })
}


/**
 * Crea un evento di eliminazione (kind 5)
 */
export function createDeleteEvent(
    eventId: string,
    reason = "deleted",
    sk?: Uint8Array
): NostrEvent {
    const tags = [["e", eventId], ["reason", reason]]
    return createEvent(5, reason, tags, sk)
}

/**
 * Crea un evento di unsubscribe (kind 9736 personalizzato)
 */
export function createUnsubscribeEvent(
    postId: string,
    userPubkey: string,
    sk?: Uint8Array
) {
    return createEvent(
        9736,
        `Unsubscribe from post ${postId}`,
        [
            ["e", postId],
            ["payer", userPubkey]   // 👈 coerente col 9735
        ],
        sk
    );
}

/**
 * Crea un commento (kind: 1)
 */
export function createCommentEvent(
    postId: string,
    userPubkey: string,
    content: string,
    sk?: Uint8Array
) {
    return createEvent(
        1,
        content,
        [["e", postId], ["p", userPubkey]],
        sk
    );
}

/**
 * Crea una reazione (kind: 7)
 */
export function createReactionEvent(
    postId: string,
    userPubkey: string,
    reaction: string = "❤️",
    sk?: Uint8Array
) {
    return createEvent(
        7,
        reaction,
        [["e", postId], ["p", userPubkey]],
        sk
    );
}
