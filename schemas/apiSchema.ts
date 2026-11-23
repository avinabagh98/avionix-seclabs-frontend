import { z } from "zod";

export const HealthResponseSchema = z.object({
    message: z.string(),
});

export const TopologyNodeSchema = z.object({
    node_id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    console_port: z.number().nullable(),
});

export const TopologyLinkSchema = z.object({
    link_id: z.string(),
    endpoints: z.tuple([z.string(), z.string()]),
});

export const TopologyMapSchema = z.object({
    status: z.literal("success"),
    project_id: z.string(),
    project_name: z.string(),
    nodes: z.array(TopologyNodeSchema),
    links: z.array(TopologyLinkSchema),
});

export const RouterSyncResponseSchema = z.object({
    status: z.literal("success"),
    router: z.string(),
    last_synced: z.string(),
    interfaces_count: z.number(),
    acls_count: z.number(),
});

export const RouterInterfaceSchema = z.object({
    name: z.string(),
    short_name: z.string().nullish(),
    vlan_id: z.number().nullish(),
    ip_address: z.string().nullish(),
    subnet_mask: z.string().nullish(),
    acl_in: z.string().nullish(),
    acl_out: z.string().nullish(),
});

const PortSchema = z.union([z.string(), z.number()]).nullish();

export const AclRuleSchema = z.object({
    sequence: z.number(),
    action: z.string(),
    protocol: z.string(),
    source: z.string(),
    source_wildcard: z.string().nullish(),
    source_port: PortSchema,
    destination: z.string(),
    destination_wildcard: z.string().nullish(),
    destination_port: PortSchema,
});

export const AclSchema = z.object({
    name: z.string(),
    type: z.string().nullish(),
    rules: z.array(AclRuleSchema),
});

export const VtySecuritySchema = z.object({
    vty_found: z.boolean().nullish(),
    protected: z.boolean().nullish(),
    access_class: z.string().nullish(),
});

export const RouterStateSchema = z.object({
    router: z.string(),
    host_ip: z.string().nullish(),
    last_synced: z.string().nullish(),
    interfaces: z.array(RouterInterfaceSchema),
    acls: z.array(AclSchema),
    vty_security: VtySecuritySchema.nullish(),
});

export const SimulatorEvaluationSchema = z.object({
    verdict: z.enum(["PERMIT", "DENY"]),
    matched_acl: z.string().nullable(),
    matched_sequence: z.number().nullable(),
    reason: z.string(),
});

export const VulnerabilitySchema = z.object({
    type: z.string(),
    severity: z.string().nullish(),
    description: z.string().nullish(),
});

export const AuditResponseSchema = z.object({
    router: z.string(),
    management_ip: z.string().nullable().optional().default(null),
    vulnerabilities: z.array(VulnerabilitySchema),
    // Kept as a string so an unexpected status never breaks the whole audit.
    overall_status: z.string(),
});

export type TopologyNode = z.infer<typeof TopologyNodeSchema>;
export type TopologyLink = z.infer<typeof TopologyLinkSchema>;
export type TopologyMap = z.infer<typeof TopologyMapSchema>;
export type RouterSyncResponse = z.infer<typeof RouterSyncResponseSchema>;
export type RouterInterface = z.infer<typeof RouterInterfaceSchema>;
export type AclRule = z.infer<typeof AclRuleSchema>;
export type Acl = z.infer<typeof AclSchema>;
export type RouterState = z.infer<typeof RouterStateSchema>;
export type SimulatorEvaluation = z.infer<typeof SimulatorEvaluationSchema>;
export type Vulnerability = z.infer<typeof VulnerabilitySchema>;
export type AuditResponse = z.infer<typeof AuditResponseSchema>;

// Matches the POST /api/simulator/evaluate contract exactly. No ports.
export interface SimulatorEvaluationPayload {
    router: string;
    interface: string;
    direction: "in" | "out";
    source_ip: string;
    destination_ip: string;
    protocol: "ip" | "tcp" | "udp" | "icmp";
}