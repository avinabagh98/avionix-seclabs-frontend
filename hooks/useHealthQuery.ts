"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type ApiState = "checking" | "online" | "offline";

export function useHealthQuery() {
    return useQuery({
        queryKey: ["health"],
        queryFn: async () => {
            const started = performance.now();
            const response = await apiClient.getHealth();
            return {
                message: response.message,
                latency: Math.max(1, Math.round(performance.now() - started)),
            };
        },
        retry: false,
        staleTime: 10_000,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });
}

export function useApiState() {
    const query = useHealthQuery();
    const state: ApiState = query.isError
        ? "offline"
        : query.isSuccess
            ? "online"
            : "checking";
    return {
        state,
        latency: query.data?.latency ?? null,
        message: query.data?.message ?? query.error?.message ?? null,
        checkedAt: Math.max(query.dataUpdatedAt, query.errorUpdatedAt) || null,
        isFetching: query.isFetching,
        recheck: query.refetch,
    };
}