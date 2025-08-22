"use client";

import { usePathname } from "next/navigation";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div key={pathname} className="min-h-screen w-full animate-fadeIn">
            {children}
        </div>
    );
}
