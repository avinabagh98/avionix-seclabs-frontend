"use client";

import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000): number {
    const [now, setNow] = useState<number>(0);

    useEffect(() => {
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}