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
        <header className="sticky top-0 w-full z-50 bg-white/70 backdrop-blur-md shadow-lg">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-2xl transition-transform group-hover:rotate-12">⚡</span>
                    <span className="text-xl font-extrabold text-gray-800 tracking-wide">
            ZapGate
          </span>
                </Link>

                {/* Desktop menu */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative transition font-medium ${
                                pathname === link.href
                                    ? "text-purple-600"
                                    : "text-gray-700 hover:text-purple-600"
                            }`}
                        >
                            {link.label}
                            {/* underline animata */}
                            <span
                                className={`absolute left-0 -bottom-1 h-[2px] bg-purple-500 transition-all ${
                                    pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                                }`}
                            />
                        </Link>
                    ))}

                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
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
                    {menuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
            </div>

            {/* Mobile menu con animazione */}
            {menuOpen && (
                <div className="md:hidden bg-white/90 backdrop-blur-md shadow-lg animate-slideDown">
                    <nav className="flex flex-col p-4 gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`transition font-medium ${
                                    pathname === link.href
                                        ? "text-purple-600"
                                        : "text-gray-700 hover:text-purple-600"
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
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setMenuOpen(false)}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition text-center"
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
