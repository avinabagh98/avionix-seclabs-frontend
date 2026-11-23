"use client";

import StatusPill from "@/components/ui/StatusPill";
import { useApiState } from "@/hooks/useHealthQuery";

export default function ApiPill() {
    const { state } = useApiState();
    if (state === "online") return <StatusPill level="ok" label="API ONLINE" />;
    if (state === "offline") return <StatusPill level="crit" label="API OFFLINE" />;
    return <StatusPill level="warn" label="CHECKING" pulse />;
}