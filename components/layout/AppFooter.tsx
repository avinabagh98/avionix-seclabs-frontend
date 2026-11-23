"use client";

import { useApiState } from "@/hooks/useHealthQuery";
import { API_BASE_URL } from "@/lib/api";

export default function AppFooter() {
    const { state } = useApiState();
    return (
        <footer className="wrap foot">
            <div>
                Avionix SecLabs frontend. API {state}
                {state === "online" ? ` at ${API_BASE_URL}` : ""}.
            </div>
        </footer>
    );
}