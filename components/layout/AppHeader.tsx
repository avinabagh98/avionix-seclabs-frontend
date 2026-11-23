"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import ApiPill from "@/components/ui/ApiPill";
import { useApiState } from "@/hooks/useHealthQuery";
import { logActivity, notify } from "@/lib/notify";

const NAV = [
    { href: "/", label: "Overview" },
    { href: "/topology", label: "Topology" },
    { href: "/simulator", label: "Simulator" },
];

export default function AppHeader() {
    const pathname = usePathname();
    const api = useApiState();
    const previous = useRef<string | null>(null);

    useEffect(() => {
        if (api.state === "checking" || previous.current === api.state) return;
        const wasOffline = previous.current === "offline";
        previous.current = api.state;
        if (api.state === "online") {
            logActivity("API", "SYS", "Health check passed.", "ok");
            if (wasOffline) notify("ok", "API reconnected", "The backend is answering again.");
        } else {
            logActivity("API", "SYS", "Health check failed. API unreachable.", "crit");
            notify("crit", "API unreachable", api.message ?? "The backend did not answer the health check.");
        }
    }, [api.state, api.message]);

    return (
        <header className="top">
            <div className="wrap bar">
                <Link className="brand" href="/" aria-label="Avionix SecLabs overview">
                    <svg viewBox="0 0 28 28" aria-hidden="true">
                        <path
                            d="M14 2.5l9.5 3.8v6.9c0 5.6-4 9.7-9.5 12.3C8.5 22.9 4.5 18.8 4.5 13.2V6.3z"
                            fill="none"
                            stroke="#FF4A5C"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                        <circle cx="14" cy="13" r="3" fill="#D31C35" />
                    </svg>
                    <span>Avionix SecLabs</span>
                </Link>
                <nav className="nav" aria-label="Primary">
                    {NAV.map((item) => {
                        const active =
                            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="hdr-api" role="status" aria-live="polite">
                    <ApiPill />
                </div>
            </div>
        </header>
    );
}