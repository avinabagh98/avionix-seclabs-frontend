import {
    AuditResponseSchema,
    HealthResponseSchema,
    RouterStateSchema,
    RouterSyncResponseSchema,
    SimulatorEvaluationSchema,
    TopologyMapSchema,
    type AuditResponse,
    type RouterState,
    type RouterSyncResponse,
    type SimulatorEvaluation,
    type SimulatorEvaluationPayload,
    type TopologyMap,
} from "@/schemas/apiSchema";
import { ApiHttpError, ApiNetworkError, SchemaDriftError } from "@/lib/errors";
import { z } from "zod";

export const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function describeErrorBody(body: unknown, fallback: string): string {
    if (typeof body !== "object" || body === null) {
        return typeof body === "string" && body ? body : fallback;
    }

    const record = body as Record<string, unknown>;
    const detail = record.detail ?? record.message;
    if (typeof detail === "string") {
        return detail;
    }
    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === "object" && item !== null && "msg" in item) {
                    return String(item.msg);
                }
                return JSON.stringify(item);
            })
            .join("; ");
    }
    return fallback;
}

async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestInit = {},
    baseUrl = API_BASE_URL,
): Promise<T> {
    const base = baseUrl.replace(/\/+$/, "");

    let response: Response;
    try {
        response = await fetch(`${base}${path}`, {
            method: options.method ?? "GET",
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers,
            },
        });
    } catch (cause: unknown) {
        throw new ApiNetworkError(base, cause);
    }

    const responseText = await response.text();
    let responseBody: unknown = null;
    if (responseText) {
        try {
            responseBody = JSON.parse(responseText);
        } catch {
            if (response.ok) {
                throw new Error(`The API returned invalid JSON for ${path}.`);
            }
            responseBody = responseText;
        }
    }

    if (!response.ok) {
        throw new ApiHttpError(
            response.status,
            describeErrorBody(
                responseBody,
                `API request failed with status ${response.status}.`,
            ),
            responseBody,
        );
    }

    const parsed = schema.safeParse(responseBody);
    if (!parsed.success) {
        throw new SchemaDriftError(path, parsed.error.issues, responseBody);
    }
    return parsed.data;
}

export const apiClient = {
    getHealth(): Promise<{ message: string }> {
        return request("/", HealthResponseSchema);
    },

    getTopology(baseUrl?: string): Promise<TopologyMap> {
        return request("/api/topology/map", TopologyMapSchema, {}, baseUrl);
    },

    syncRouter(routerName: string): Promise<RouterSyncResponse> {
        return request(
            `/api/router/${encodeURIComponent(routerName)}/sync`,
            RouterSyncResponseSchema,
            { method: "POST" },
        );
    },

    getRouterState(routerName: string): Promise<RouterState> {
        return request(
            `/api/router/${encodeURIComponent(routerName)}/state`,
            RouterStateSchema,
        );
    },

    evaluateTraffic(
        payload: SimulatorEvaluationPayload,
    ): Promise<SimulatorEvaluation> {
        return request("/api/simulator/evaluate", SimulatorEvaluationSchema, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    getAudit(routerName: string): Promise<AuditResponse> {
        return request(
            `/api/simulator/audit/${encodeURIComponent(routerName)}`,
            AuditResponseSchema,
        );
    },
};