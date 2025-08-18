// lib/nostr.ts
import { SimplePool, generateSecretKey, getPublicKey, finalizeEvent, type Event as NostrEvent } from 'nostr-tools'
import { RELAYS } from './config'

export const pool = new SimplePool()

/**
 * Crea un evento nostr generico firmato
 */
export function createEvent(
    kind: number,
    content: string,
    tags: string[][] = [],
    sk?: Uint8Array
): NostrEvent {
    const secret = sk || generateSecretKey()
    const pubkey = getPublicKey(secret)

    const template = {
        kind,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
    }
    console.log("DEBUG template finale:", JSON.stringify(template))

    const ev = finalizeEvent(template, secret)

    // ✅ qui aggiungo il pubkey manualmente
    return { ...ev, pubkey }
}


/**
 * Crea una Zap Request (kind 9734)
 */
export function createZapRequest({
                                     senderPubkey,
                                     receiverPubkey,
                                     amount,
                                     noteId,
                                     sk
                                 }: {
    senderPubkey: string
    receiverPubkey: string
    amount: number
    noteId?: string
    sk?: Uint8Array
}): NostrEvent {
    const tags: string[][] = [
        ["p", receiverPubkey],
        ["amount", String(amount)],   // 👈 forza stringa
        ["from", senderPubkey],
    ]

    if (noteId) tags.push(["e", noteId])

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
                                     sk
                                 }: {
    receiverPubkey: string
    senderPubkey: string
    amount: number
    zapRequestId: string
    sk?: Uint8Array
}): NostrEvent {
    const tags: string[][] = [
        ["p", receiverPubkey],
        ["amount", String(amount)],   // 👈 forza stringa
        ["e", zapRequestId],
        ["from", senderPubkey],
    ]

    return createEvent(9735, `Zap receipt of ${amount} sats`, tags, sk)
}

/**
 * Pubblica un evento su tutti i relay
 */
export async function publishEvent(ev: NostrEvent): Promise<void> {
    const pubs = pool.publish(RELAYS, ev)
    await Promise.all(pubs)
}

/**
 * Aspetta un zap receipt per un dato destinatario
 */
export async function waitForZapReceipt({
                                            recipientPubkey,
                                            since = Math.floor(Date.now() / 1000) - 600,
                                            timeoutMs = 20000
                                        }: {
    recipientPubkey: string
    since?: number
    timeoutMs?: number
}): Promise<NostrEvent | null> {
    return new Promise((resolve) => {
        const sub = pool.subscribeMany(
            RELAYS,
            [{ kinds: [9735], "#p": [recipientPubkey], since }],
            {
                onevent: (ev) => {
                    sub.close()
                    resolve(ev)
                },
                oneose: () => {}
            }
        )
        setTimeout(() => {
            sub.close()
            resolve(null)
        }, timeoutMs)
    })
}

