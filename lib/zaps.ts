import { createZapRequest, createZapReceipt, publishEvent } from "./nostr";

interface ZapPaymentResult {
    zapRequest: any;
    zapReceipt: any;
}

export async function zapPayment(
    payerNpub: string,
    receiverNpub: string,
    amount: number,
    memo: string
): Promise<ZapPaymentResult> {
    // ⚡ 1. crea invoice su LND del receiver
    const invoiceRes = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            receiverId: receiverNpub,
            amount,
            memo,
        }),
    }).then(r => r.json());

    if (!invoiceRes.payment_request) {
        throw new Error("Errore creazione invoice: " + JSON.stringify(invoiceRes));
    }

    const bolt11 = invoiceRes.payment_request;

    // ⚡ 2. genera ZapRequest
    const zapRequest = createZapRequest({
        senderPubkey: payerNpub,
        receiverPubkey: receiverNpub,
        amount,
    });
    await publishEvent(zapRequest);

    // ⚡ 3. paga l’invoice
    const payRes = await fetch("/api/pay-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            payerId: payerNpub,
            paymentRequest: bolt11,
        }),
    }).then(r => r.json());

    if (payRes.payment_error || payRes.error) {
        throw new Error("Pagamento fallito: " + (payRes.payment_error || payRes.error));
    }

    // ⚡ 4. genera ZapReceipt
    const zapReceipt = createZapReceipt({
        receiverPubkey: receiverNpub,
        senderPubkey: payerNpub,
        amount,
        zapRequestId: zapRequest.id,
    });
    await publishEvent(zapReceipt);

    // 📝 5. salva in localStorage
    if (typeof window !== "undefined") {
        const existing = JSON.parse(localStorage.getItem("zapHistory") || "[]");
        existing.unshift({ time: Date.now(), zapRequest, zapReceipt });
        localStorage.setItem("zapHistory", JSON.stringify(existing));
    }

    return { zapRequest, zapReceipt };
}
