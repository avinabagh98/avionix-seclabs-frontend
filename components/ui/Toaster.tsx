"use client";

import { useState, type CSSProperties, type ReactElement } from "react";
import { useAppStore, type Level, type ToastEntry } from "@/store/useAppStore";

const DURATION: Record<Level, number> = { crit: 9000, warn: 6500, ok: 4500, info: 4500 };

const ICONS: Record<Level, ReactElement> = {
    ok: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" />
            <path d="M6.5 10.2l2.5 2.5 4.5-5" />
        </svg>
    ),
    warn: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2.8l8 14H2z" />
            <path d="M10 8v4M10 14.5v.1" />
        </svg>
    ),
    crit: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 1.8l8.2 8.2L10 18.2 1.8 10z" />
            <path d="M10 6.5v4.5M10 13.5v.1" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 9v5M10 6.2v.1" />
        </svg>
    ),
};

function ToastItem({ toast }: { toast: ToastEntry }) {
    const dismissToast = useAppStore((state) => state.dismissToast);
    const [leaving, setLeaving] = useState(false);

    function dismiss() {
        if (leaving) return;
        setLeaving(true);
        window.setTimeout(() => dismissToast(toast.id), 180);
    }

    return (
        <div
            className={`toast k-${toast.level}${leaving ? " leaving" : ""}`}
            role={toast.level === "crit" ? "alert" : "status"}
            style={{ "--life": `${DURATION[toast.level]}ms` } as CSSProperties}
        >
            <span className="toast-ico">{ICONS[toast.level]}</span>
            <div>
                <p className="toast-title">{toast.title}</p>
                {toast.message && <p className="toast-msg">{toast.message}</p>}
            </div>
            <button className="toast-x" type="button" aria-label="Dismiss notification" onClick={dismiss}>
                <svg viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
            </button>
            <span className="toast-life" onAnimationEnd={dismiss} />
        </div>
    );
}

export default function Toaster() {
    const toasts = useAppStore((state) => state.toasts);
    return (
        <div className="toasts" role="region" aria-label="Notifications">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}