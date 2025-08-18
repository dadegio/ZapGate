// lib/zaps.ts
import { createZapRequest, createZapReceipt, publishEvent } from "./nostr";

// pagamento con zap
export async function zapPayment(payer: any, receiver: any, amount: number, memo: string) {
    // ⚡ 1. crea invoice su LND del receiver
    const invoiceRes = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            receiverId: receiver.pubkey,
            amount,
            memo,
        }),
    }).then(r => r.json());

    if (!invoiceRes.payment_request) {
        throw new Error("Errore creazione invoice: " + JSON.stringify(invoiceRes));
    }

    const bolt11 = invoiceRes.payment_request;

    // ⚡ 2. genera ZapRequest (kind 9734)
    const zapRequest = createZapRequest({
        senderPubkey: payer.nostr_pubkey,
        receiverPubkey: receiver.nostr_pubkey,
        amount,
    });
    await publishEvent(zapRequest);

    // ⚡ 3. paga l’invoice con LND di payer
    const payRes = await fetch("/api/pay-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            payerId: payer.pubkey,
            paymentRequest: bolt11,
        }),
    }).then(r => r.json());

    if (payRes.payment_error || payRes.error) {
        throw new Error("Pagamento fallito: " + (payRes.payment_error || payRes.error));
    }

    // ⚡ 4. genera ZapReceipt (kind 9735)
    const zapReceipt = createZapReceipt({
        receiverPubkey: receiver.nostr_pubkey,
        senderPubkey: payer.nostr_pubkey,
        amount,
        zapRequestId: zapRequest.id,
    });
    await publishEvent(zapReceipt);

    // 📝 5. salva in localStorage (solo client)
    if (typeof window !== "undefined") {
        const existing = JSON.parse(localStorage.getItem("zapHistory") || "[]");
        existing.unshift({ time: Date.now(), zapRequest, zapReceipt });
        localStorage.setItem("zapHistory", JSON.stringify(existing));
    }

    return { zapRequest, zapReceipt };
}
