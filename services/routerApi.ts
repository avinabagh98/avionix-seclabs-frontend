import { apiClient } from "@/lib/api";
import { logActivity, notify, reportError } from "@/lib/notify";
import { statusLevel } from "@/lib/status";
import { useAppStore } from "@/store/useAppStore";
import type {
    AuditResponse,
    RouterState,
    RouterSyncResponse,
} from "@/schemas/apiSchema";

export async function syncRouter(routerId: string): Promise<RouterSyncResponse> {
    try {
        const result = await apiClient.syncRouter(routerId);
        notify("ok", "Synced", `${result.router} has ${result.interfaces_count} interfaces and ${result.acls_count} ACLs.`);
        logActivity("SYNC", result.router, `Synced ${result.router}.`, "ok");
        return result;
    } catch (error: unknown) {
        reportError(error, { module: "SYNC", router: routerId, what: `Sync of ${routerId}` });
        throw error;
    }
}

export async function loadRouterState(routerId: string): Promise<RouterState> {
    try {
        const result = await apiClient.getRouterState(routerId);
        notify("info", "State loaded", `Cached state for ${result.router} is shown below the controls.`);
        logActivity("STATE", result.router, `Loaded cached state for ${result.router}.`, "info");
        return result;
    } catch (error: unknown) {
        reportError(error, { module: "STATE", router: routerId, what: `Loading state for ${routerId}` });
        throw error;
    }
}

export async function auditRouter(
    routerId: string,
    options: { quiet?: boolean } = {},
): Promise<AuditResponse> {
    try {
        const result = await apiClient.getAudit(routerId);
        useAppStore.getState().recordAudit(routerId, result);
        const level = statusLevel(result.overall_status);
        const count = result.vulnerabilities.length;
        const summary = `${count} finding${count === 1 ? "" : "s"}`;
        logActivity("AUDIT", routerId, `Audit of ${routerId}: ${result.overall_status}, ${summary}.`, level);
        if (!options.quiet) {
            notify(level, `Audit complete: ${result.overall_status}`, `${routerId} has ${summary}.`);
        }
        return result;
    } catch (error: unknown) {
        reportError(error, {
            module: "AUDIT",
            router: routerId,
            what: `Audit of ${routerId}`,
            silent: options.quiet,
        });
        throw error;
    }
}