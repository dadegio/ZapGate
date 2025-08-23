"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Menu,
    X,
    FileText,
    PlusCircle,
    User,
    LogOut,
    LogIn,
    Search,
    Info,
} from "lucide-react";

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
        { href: "/about", label: "About", icon: <Info size={18} /> },
        { href: "/transactions", label: "Transazioni", icon: <FileText size={18} /> },
        { href: "/my-content", label: "Sbloccati", icon: <FileText size={18} /> },
        { href: "/create", label: "Crea", icon: <PlusCircle size={18} /> },
        { href: "/users", label: "Utenti", icon: <Search size={18} /> },
        user
            ? { href: `/profile/${user.npub}`, label: "Profilo", icon: <User size={18} /> }
            : { href: "/login", label: "Profilo", icon: <User size={18} /> },
    ];

    return (
        <header className="sticky top-0 w-full z-50 bg-white/60 backdrop-blur-lg border-b border-purple-200/40">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-2xl transition-transform group-hover:rotate-12">⚡</span>
                    <span className="text-xl font-extrabold text-gray-800 tracking-wide">
            ZapGate
          </span>
                </Link>

                {/* Desktop menu */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative flex items-center gap-1 px-2 py-1 rounded-md transition ${
                                pathname === link.href
                                    ? "text-purple-600 font-semibold"
                                    : "text-gray-700 hover:text-purple-600"
                            }`}
                        >
                            {link.icon}
                            {link.label}
                            {pathname === link.href && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 rounded-full"></span>
                            )}
                        </Link>
                    ))}

                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="ml-4 flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="ml-4 flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
                        >
                            <LogIn size={18} /> Login
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

            {/* Mobile menu - slide da destra */}
            {menuOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-40">
                    <div className="absolute top-0 right-0 w-3/4 h-full bg-white shadow-lg p-6 flex flex-col gap-6 animate-slideIn">
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="self-end text-gray-500 hover:text-gray-700"
                        >
                            <X size={26} />
                        </button>

                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center gap-2 text-lg font-medium ${
                                    pathname === link.href
                                        ? "text-purple-600"
                                        : "text-gray-700 hover:text-purple-600"
                                }`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        ))}

                        {user ? (
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setMenuOpen(false);
                                }}
                                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-105 transition text-center"
                            >
                                <LogIn size={18} /> Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
