// components/CommentBox.tsx
"use client";

import { useEffect, useState } from "react";
import { pool, publishEvent } from "../lib/nostr";
import { RELAYS } from "../lib/config";

interface CommentBoxProps {
    postId: string;
    loggedUser: any;
}

interface Comment {
    id: string;
    content: string;
    pubkey: string;
    created_at: number;
}

export default function CommentBox({ postId, loggedUser }: CommentBoxProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");

    // 🔹 Carica commenti esistenti
    useEffect(() => {
        const sub = pool.sub(
            RELAYS.map((r) => r.url),
            [{ kinds: [1], "#e": [postId] }]
        );

        sub.on("event", (ev) => {
            const newComment: Comment = {
                id: ev.id,
                content: ev.content,
                pubkey: ev.pubkey,
                created_at: ev.created_at,
            };

            setComments((prev) => {
                if (prev.find((c) => c.id === newComment.id)) return prev;
                return [...prev, newComment].sort((a, b) => a.created_at - b.created_at);
            });
        });

        sub.on("eose", () => sub.unsub());

        return () => sub.unsub();
    }, [postId]);

    // 🔹 Invia commento
    const handleSend = async () => {
        if (!text.trim()) return;
        if (!loggedUser) return;

        const ev = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [["e", postId]],
            content: text,
            pubkey: loggedUser.npub,
        };

        await publishEvent(ev as any);
        setText("");
    };

    return (
        <div className="mt-8">
            <h3 className="font-semibold text-gray-800 mb-2">💬 Commenti</h3>

            <div className="space-y-3 mb-4">
                {comments.map((c) => (
                    <div key={c.id} className="bg-gray-100 rounded-lg p-2 text-sm">
                        <p className="text-gray-800">{c.content}</p>
                        <p className="text-xs text-gray-500">
                            👤 {c.pubkey.slice(0, 10)}…
                        </p>
                    </div>
                ))}
                {comments.length === 0 && (
                    <p className="text-gray-400 text-sm">Nessun commento ancora.</p>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Scrivi un commento..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
