import { apiClient } from "@/lib/api";
import { logActivity, notify, reportError } from "@/lib/notify";
import type {
    SimulatorEvaluation,
    SimulatorEvaluationPayload,
} from "@/schemas/apiSchema";

export async function evaluatePacket(
    payload: SimulatorEvaluationPayload,
): Promise<SimulatorEvaluation> {
    try {
        const result = await apiClient.evaluateTraffic(payload);
        const permit = result.verdict === "PERMIT";
        notify(
            permit ? "ok" : "warn",
            permit ? "Traffic permitted" : "Traffic denied",
            result.matched_acl
                ? `ACL ${result.matched_acl}, sequence ${result.matched_sequence ?? "n/a"}.`
                : "No explicit ACL entry matched.",
        );
        logActivity(
            "SIM",
            payload.router,
            `Evaluated ${payload.protocol} ${payload.source_ip} to ${payload.destination_ip}: ${result.verdict}.`,
            permit ? "ok" : "warn",
        );
        return result;
    } catch (error: unknown) {
        reportError(error, { module: "SIM", router: payload.router, what: "Packet evaluation" });
        throw error;
    }
}