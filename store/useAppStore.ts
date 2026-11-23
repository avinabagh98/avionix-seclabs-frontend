import { create } from "zustand";
import type { AuditResponse } from "@/schemas/apiSchema";

export type Level = "ok" | "warn" | "crit" | "info";

export interface TelemetryEntry {
    module: string;
    router: string;
    message: string;
    timestamp: string;
    level: Level;
}

interface TelemetryInput {
    module: string;
    router: string;
    message: string;
    level?: Level;
}

export interface ToastEntry {
    id: number;
    level: Level;
    title: string;
    message?: string;
}

export interface AuditRecord {
    result: AuditResponse;
    at: number;
}

interface AppState {
    telemetryLogs: TelemetryEntry[];
    toasts: ToastEntry[];
    audits: Record<string, AuditRecord>;
    pushTelemetry: (entry: TelemetryInput) => void;
    pushToast: (toast: Omit<ToastEntry, "id">) => void;
    dismissToast: (id: number) => void;
    recordAudit: (routerId: string, result: AuditResponse) => void;
    resetStoreForTests: () => void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>((set) => ({
    telemetryLogs: [],
    toasts: [],
    audits: {},
    pushTelemetry: (entry) =>
        set((state) => ({
            telemetryLogs: [
                { level: "info", ...entry, timestamp: new Date().toISOString() } as TelemetryEntry,
                ...state.telemetryLogs,
            ].slice(0, 100),
        })),
    pushToast: (toast) =>
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id: ++toastSeq }].slice(-4),
        })),
    dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    recordAudit: (routerId, result) =>
        set((state) => ({
            audits: { ...state.audits, [routerId]: { result, at: Date.now() } },
        })),
    resetStoreForTests: () => set({ telemetryLogs: [], toasts: [], audits: {} }),
}));