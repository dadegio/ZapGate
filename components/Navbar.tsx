'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem("loggedInUser");
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("loggedInUser");
        setUser(null);
        router.push("/login");
    };

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/transactions", label: "Transazioni" },
        { href: "/my-content", label: "Sbloccati" },
        { href: "/create", label: "Crea" },
        user
            ? { href: `/profile/${user.npub}`, label: "Profilo" }
            : { href: "/login", label: "Profilo" },
    ];

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

                {/* Desktop menu */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition ${
                                pathname === link.href
                                    ? "text-purple-700 font-bold underline"
                                    : "text-gray-700 hover:text-gray-900"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="bg-white/80 text-gray-700 px-3 py-1 rounded-lg font-semibold hover:bg-white transition shadow-sm"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg font-semibold shadow-sm transition"
                        >
                            Login
                        </Link>
                    )}
                </nav>

                {/* Mobile toggle */}
                <button
                    className="md:hidden text-gray-700"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-white/90 backdrop-blur shadow-md">
                    <nav className="flex flex-col p-4 gap-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`transition ${
                                    pathname === link.href
                                        ? "text-purple-700 font-bold underline"
                                        : "text-gray-700 hover:text-gray-900"
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {user ? (
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setMenuOpen(false);
                                }}
                                className="bg-white/80 text-gray-700 px-3 py-1 rounded-lg font-semibold hover:bg-white transition shadow-sm"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setMenuOpen(false)}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg font-semibold shadow-sm transition text-center"
                            >
                                Login
                            </Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
