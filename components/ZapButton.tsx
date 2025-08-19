"use client";

import { useState } from "react";

interface ZapButtonProps {
    amount: number;
    payerId: string;     // npub o nome nodo
    receiverId: string;  // npub o nome nodo
    memo?: string;
}

export default function ZapButton({ amount, payerId, receiverId, memo }: ZapButtonProps) {
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        try {
            setLoading(true);

            if (!receiverId) throw new Error("ReceiverId mancante");
            if (!payerId) throw new Error("PayerId mancante");

            // 1) Crea invoice sul nodo ricevente
            const invoiceRes = await fetch("/api/create-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId,
                    amount,
                    memo: memo || "ZapGate demo",
                }),
            });

            if (!invoiceRes.ok) throw new Error("Errore creazione invoice");

            const invoice = await invoiceRes.json();
            if (!invoice.payment_request) throw new Error("Invoice non ricevuta dal nodo ricevente");

            console.log("⚡ Invoice:", invoice.payment_request);

            // 2) Paga invoice dal nodo mittente
            const payRes = await fetch("/api/pay-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payerId,
                    paymentRequest: invoice.payment_request,
                }),
            });

            const payment = await payRes.json();
            console.log("📩 Risultato pagamento:", payment);

            if (payRes.ok && !payment.payment_error) {
                alert("✅ Pagamento riuscito!");
            } else {
                throw new Error(payment.error || payment.payment_error || "Pagamento fallito");
            }

        } catch (err) {
            console.error("💥 Errore pagamento:", err);
            alert("Errore: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePay}
            disabled={loading}
            className="px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500 disabled:opacity-50"
        >
            {loading ? "Elaborazione..." : `Paga ${amount} sats`}
        </button>
    );
}
