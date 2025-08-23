'use client';

import Link from 'next/link';

interface TrendingCardProps {
    rank: number;
    post: {
        id: string;
        score: number;
        zaps: number;
        reactions: number;
    };
}

export default function TrendingCard({ rank, post }: TrendingCardProps) {
    return (
        <Link href={`/content/${post.id}`}>
            <div className="bg-white/90 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition transform p-6 cursor-pointer relative">
                <div className="absolute right-4 top-4 text-purple-200 text-5xl font-bold opacity-30">
                    #{rank}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    Post {post.id.slice(0, 8)}…
                </h2>
                <p className="text-sm text-gray-600">
                    ⚡ Zaps: {post.zaps} | ❤️ Reazioni: {post.reactions}
                </p>
                <p className="mt-2 font-semibold text-purple-600">🔥 Punteggio: {post.score}</p>
            </div>
        </Link>
    );
}
