import type { Level } from "@/store/useAppStore";

export function statusLevel(status: string | null | undefined): Level {
    switch ((status ?? "").trim().toUpperCase()) {
        case "SECURE":
        case "PERMIT":
        case "STARTED":
        case "RUNNING":
            return "ok";
        case "WARNING":
            return "warn";
        case "AT RISK":
        case "DENY":
            return "crit";
        default:
            return "info";
    }
}

export function severityLevel(severity: string | null | undefined): Level {
    switch ((severity ?? "").trim().toUpperCase()) {
        case "CRITICAL":
        case "HIGH":
            return "crit";
        case "MEDIUM":
        case "WARNING":
            return "warn";
        default:
            return "info";
    }
}

export function formatTime(value: Date | string | number | null | undefined): string {
    if (value === null || value === undefined || value === 0) {
        return "n/a";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleTimeString("en-GB", { hour12: false });
}