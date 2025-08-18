'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const router = useRouter();

    const handleLogout = () => {
        sessionStorage.removeItem("loggedInUser");
        router.push("/login");
    };

    return (
        <header className="sticky top-0 w-full z-50 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 shadow-md backdrop-blur">
            <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span className="text-xl font-extrabold text-gray-700 tracking-wide">
                        ZapGate
                    </span>
                </Link>

                {/* Menu */}
                <nav className="flex items-center gap-6">
                    <Link href="/" className="text-gray-700 hover:text-gray-900 transition">
                        Home
                    </Link>
                    <Link href="/transactions" className="text-gray-700 hover:text-gray-900 transition">
                        Transazioni
                    </Link>
                    <Link href="/unlocked" className="text-gray-700 hover:text-gray-900 transition">
                        Sbloccati
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="bg-white/80 text-gray-700 px-3 py-1 rounded-lg font-semibold hover:bg-white transition shadow-sm"
                    >
                        Logout
                    </button>
                </nav>
            </div>
        </header>
    );
}
