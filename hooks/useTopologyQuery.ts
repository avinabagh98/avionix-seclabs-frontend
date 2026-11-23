"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTopologyMap } from "@/services/topologyApi";

export function useTopologyQuery() {
    return useQuery({
        queryKey: ["topology"],
        queryFn: () => fetchTopologyMap(),
        staleTime: 15_000,
        refetchInterval: 15_000,
        refetchIntervalInBackground: false,
    });
}
