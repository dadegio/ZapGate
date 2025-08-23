"use client";

import { useEffect, useState } from "react";
import { pool, publishEvent } from "../lib/nostr";
import { RELAYS } from "../lib/config";

interface ReactionButtonsProps {
    postId: string;
    loggedUser: any;
}

export default function ReactionButtons({ postId, loggedUser }: ReactionButtonsProps) {
    const [reactions, setReactions] = useState<Record<string, number>>({
        "👍": 0,
        "❤️": 0,
        "⚡": 0,
    });

    // 🔹 Carica reazioni
    useEffect(() => {
        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [7], "#e": [postId] }]
        );

        sub.on("event", (ev) => {
            const emoji = ev.content.trim();
            if (!["👍", "❤️", "⚡"].includes(emoji)) return;

            setReactions((prev) => ({
                ...prev,
                [emoji]: (prev[emoji] || 0) + 1,
            }));
        });

        sub.on("eose", () => sub.unsub());

        return () => sub.unsub();
    }, [postId]);

    // 🔹 Invia reazione
    const sendReaction = async (emoji: string) => {
        if (!loggedUser) return;

        const ev = {
            kind: 7,
            created_at: Math.floor(Date.now() / 1000),
            tags: [["e", postId]],
            content: emoji,
            pubkey: loggedUser.npub,
        };

        await publishEvent(ev as any);
    };

    return (
        <div className="flex gap-4 mt-6">
            {Object.entries(reactions).map(([emoji, count]) => (
                <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    <span>{emoji}</span>
                    <span className="text-sm text-gray-600">{count}</span>
                </button>
            ))}
        </div>
    );
}
