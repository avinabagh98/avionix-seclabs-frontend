import type { TopologyNode } from "@/schemas/apiSchema";

/**
 * The topology endpoint names nodes the way GNS3 does ("R-HQ"), but the router
 * and simulator endpoints expect a router identifier ("R_HQ_IP").
 * Only R-HQ is confirmed. Add the branch routers here once you know their ids.
 * A node that is not listed falls back to its own name.
 */
export const ROUTER_ID_BY_NODE_NAME: Record<string, string> = {
    "R-HQ": "R_HQ_IP",
    // "R-BR1": "<router id for R-BR1>",
    // "R-BR2": "<router id for R-BR2>",
    // "R-BR3": "<router id for R-BR3>",
};

export function isRouterNode(node: TopologyNode): boolean {
    return node.type === "dynamips" || /^R[-_]/i.test(node.name);
}

export function routerNodes(nodes: TopologyNode[]): TopologyNode[] {
    return nodes.filter(isRouterNode);
}

export function routerIdFor(node: TopologyNode): string {
    return ROUTER_ID_BY_NODE_NAME[node.name] ?? node.name;
}

export function nodeKind(type: string): string {
    switch (type) {
        case "dynamips":
            return "router";
        case "ethernet_switch":
            return "switch";
        case "vpcs":
            return "host";
        default:
            return type;
    }
}