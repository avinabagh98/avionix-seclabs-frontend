import { ApiHttpError, ApiNetworkError, SchemaDriftError } from "@/lib/errors";
import { useAppStore, type Level } from "@/store/useAppStore";

export function notify(level: Level, title: string, message?: string): void {
    useAppStore.getState().pushToast({ level, title, message });
}

export function logActivity(
    module: string,
    router: string,
    message: string,
    level: Level = "info",
): void {
    useAppStore.getState().pushTelemetry({ module, router, message, level });
}

export function describeError(error: unknown): { title: string; message: string } {
    if (error instanceof ApiNetworkError) {
        return { title: "API unreachable", message: error.message };
    }
    if (error instanceof ApiHttpError) {
        return { title: `Request failed (${error.status})`, message: error.message };
    }
    if (error instanceof SchemaDriftError) {
        const issues = error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.map(String).join(".") || "response"}: ${issue.message}`)
            .join("; ");
        return {
            title: "Unexpected API response",
            message: `${error.endpoint} did not match the expected schema. ${issues}`,
        };
    }
    return {
        title: "Request failed",
        message: error instanceof Error ? error.message : "The request failed unexpectedly.",
    };
}

export function reportError(
    error: unknown,
    context: { module: string; router?: string; what: string; silent?: boolean },
): void {
    const { title, message } = describeError(error);
    logActivity(context.module, context.router ?? "SYS", `${context.what} failed. ${message}`, "crit");
    if (!context.silent) {
        notify("crit", title, message);
    }
}