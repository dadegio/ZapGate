// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
    title: "ZapGate",
    description: "Demo Lightning App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it">
        <body className="min-h-screen flex flex-col font-sans bg-white">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        </body>
        </html>
    );
}
