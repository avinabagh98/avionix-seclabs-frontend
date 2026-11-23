import type { z } from "zod";

export class ApiHttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly payload: unknown,
    ) {
        super(message);
        this.name = "ApiHttpError";
    }
}

export class SchemaDriftError extends Error {
    constructor(
        public readonly endpoint: string,
        public readonly issues: z.ZodIssue[],
        public readonly payload: unknown,
    ) {
        super(`Response from ${endpoint} did not match the expected schema.`);
        this.name = "SchemaDriftError";
    }
}

export class ApiNetworkError extends Error {
    constructor(
        public readonly baseUrl: string,
        public readonly originalError: unknown,
    ) {
        super(
            `Could not reach ${baseUrl}. Start the backend and check that it allows this origin through CORS.`,
        );
        this.name = "ApiNetworkError";
    }
}