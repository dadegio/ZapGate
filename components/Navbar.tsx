"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
    Star,
    TrendingUp,
    Sun,
    Moon,
} from "lucide-react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [darkMode, setDarkMode] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Recupera utente loggato
    useEffect(() => {
        const stored = sessionStorage.getItem("loggedInUser");
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    // Dark mode → considera preferenza salvata o di sistema
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved) {
            setDarkMode(saved === "dark");
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setDarkMode(prefersDark);
        }
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

    // Chiudi dropdown se clicchi fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("loggedInUser");
        setUser(null);
        router.push("/login");
    };

    const navLinks = [
        { href: "/about", label: "About", icon: <Info size={18} /> },
        { href: "/explore", label: "Esplora", icon: <TrendingUp size={18} /> },
        { href: "/feed", label: "Seguiti", icon: <Star size={18} /> },
        { href: "/transactions", label: "Transazioni", icon: <FileText size={18} /> },
        { href: "/my-content", label: "Sbloccati", icon: <FileText size={18} /> },
        { href: "/create", label: "Crea", icon: <PlusCircle size={18} /> },
        { href: "/users", label: "Utenti", icon: <Search size={18} /> },
    ];

    return (
        <header className="sticky top-0 w-full z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-purple-200/40 dark:border-gray-700">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-2xl transition-transform group-hover:rotate-12">⚡</span>
                    <span className="text-xl font-extrabold text-gray-800 dark:text-gray-100 tracking-wide">
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
                                    : "text-gray-700 dark:text-gray-300 hover:text-purple-600"
                            }`}
                        >
                            {link.icon}
                            {link.label}
                            {pathname === link.href && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-500 rounded-full"></span>
                            )}
                        </Link>
                    ))}

                    {/* Toggle Dark Mode */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Avatar o Login */}
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-400 shadow"
                            >
                                <img
                                    src={user?.picture || "/default-avatar.png"}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                                    <Link
                                        href={`/profile/${user.npub}`}
                                        onClick={() => setDropdownOpen(false)}
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Profilo
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
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
                    className="md:hidden text-gray-700 dark:text-gray-300"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
            </div>
        </header>
    );
}
