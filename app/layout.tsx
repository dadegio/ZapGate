// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper"; // 👈 importa qui

export const metadata: Metadata = {
    title: "ZapGate",
    description: "Demo Lightning App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it">
        <body className="min-h-screen flex flex-col font-sans bg-white">
        <Navbar />
        <main className="flex-1 w-full">
            <PageWrapper>{children}</PageWrapper> {/* 👈 wrapper con fadeIn */}
        </main>
        </body>
        </html>
    );
}
