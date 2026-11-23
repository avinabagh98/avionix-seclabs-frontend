import { ApiHttpError, ApiNetworkError, SchemaDriftError } from "@/lib/errors";
import { apiClient } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { TopologyMap } from "@/schemas/apiSchema";

const ENDPOINT = "/api/topology/map";

// The topology refetches every 15 seconds. Only log when something changed.
let lastSignature = "";
let lastError = "";

export async function fetchTopologyMap(
    baseUrl?: string,
): Promise<TopologyMap> {
    try {
        const topology = await apiClient.getTopology(baseUrl);
        const signature = [
            topology.project_id,
            topology.links.length,
            topology.nodes.map((node) => `${node.node_id}:${node.status}`).join(","),
        ].join("|");
        if (signature !== lastSignature) {
            lastSignature = signature;
            useAppStore.getState().pushTelemetry({
                module: "TOPO",
                router: "SYS",
                level: "ok",
                message: `Loaded project "${topology.project_name}" (${topology.nodes.length} nodes, ${topology.links.length} links)`,
            });
        }
        lastError = "";
        return topology;
    } catch (error: unknown) {
        let module = "ERR";
        let message: string | null = null;

        if (error instanceof ApiHttpError) {
            message = `${error.status}: ${error.message}`;
        } else if (error instanceof SchemaDriftError) {
            module = "ZOD";
            const issueSummary = error.issues
                .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
                .join("; ");
            message = `Schema validation failed on GET ${ENDPOINT}: ${issueSummary}`;
        } else if (error instanceof ApiNetworkError) {
            message = error.message;
        }

        if (message && message !== lastError) {
            lastError = message;
            useAppStore.getState().pushTelemetry({ module, router: "SYS", level: "crit", message });
        }
        throw error;
    }
}