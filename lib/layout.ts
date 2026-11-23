import type { TopologyLink, TopologyNode } from "@/schemas/apiSchema";
import { isRouterNode } from "@/lib/routers";

export const NODE_W = 140;
export const NODE_H = 50;
const PITCH_X = 156;
const ROW_Y = 96;
const PAD = 30;

export interface PlacedNode {
    node: TopologyNode;
    x: number;
    y: number;
}

export interface PlacedEdge {
    id: string;
    from: PlacedNode;
    to: PlacedNode;
}

export interface TopologyLayout {
    nodes: PlacedNode[];
    edges: PlacedEdge[];
    width: number;
    height: number;
}

/** The API has no coordinates, so place nodes as a tidy tree rooted at the best-connected router. */
export function layoutTopology(
    nodes: TopologyNode[],
    links: TopologyLink[],
): TopologyLayout {
    if (nodes.length === 0) {
        return { nodes: [], edges: [], width: NODE_W + PAD * 2, height: NODE_H + PAD * 2 };
    }

    const byId = new Map(nodes.map((node) => [node.node_id, node]));
    const adjacency = new Map<string, string[]>(nodes.map((node) => [node.node_id, []]));
    for (const link of links) {
        const [a, b] = link.endpoints;
        if (!byId.has(a) || !byId.has(b)) continue;
        adjacency.get(a)?.push(b);
        adjacency.get(b)?.push(a);
    }
    const degree = (id: string) => adjacency.get(id)?.length ?? 0;

    const candidates = [...nodes].sort(
        (a, b) =>
            Number(isRouterNode(b)) - Number(isRouterNode(a)) ||
            degree(b.node_id) - degree(a.node_id),
    );

    const children = new Map<string, string[]>();
    const visited = new Set<string>();
    const roots: string[] = [];
    for (const start of candidates) {
        if (visited.has(start.node_id)) continue;
        roots.push(start.node_id);
        visited.add(start.node_id);
        const queue = [start.node_id];
        while (queue.length > 0) {
            const id = queue.shift() as string;
            const kids: string[] = [];
            for (const neighbour of adjacency.get(id) ?? []) {
                if (!visited.has(neighbour)) {
                    visited.add(neighbour);
                    kids.push(neighbour);
                    queue.push(neighbour);
                }
            }
            children.set(id, kids);
        }
    }

    const slots = new Map<string, { slot: number; depth: number }>();
    let maxDepth = 0;
    const place = (id: string, depth: number, start: number): number => {
        maxDepth = Math.max(maxDepth, depth);
        const kids = children.get(id) ?? [];
        if (kids.length === 0) {
            slots.set(id, { slot: start + 0.5, depth });
            return 1;
        }
        let used = 0;
        for (const kid of kids) {
            used += place(kid, depth + 1, start + used);
        }
        const first = slots.get(kids[0])?.slot ?? start;
        const last = slots.get(kids[kids.length - 1])?.slot ?? start;
        slots.set(id, { slot: (first + last) / 2, depth });
        return used;
    };

    let cursor = 0;
    for (const root of roots) {
        cursor += place(root, 0, cursor);
    }

    const placed = new Map<string, PlacedNode>();
    for (const node of nodes) {
        const position = slots.get(node.node_id);
        if (!position) continue;
        placed.set(node.node_id, {
            node,
            x: PAD + position.slot * PITCH_X,
            y: PAD + NODE_H / 2 + position.depth * ROW_Y,
        });
    }

    const edges: PlacedEdge[] = [];
    for (const link of links) {
        const from = placed.get(link.endpoints[0]);
        const to = placed.get(link.endpoints[1]);
        if (from && to) edges.push({ id: link.link_id, from, to });
    }

    return {
        nodes: [...placed.values()],
        edges,
        width: Math.max(cursor * PITCH_X, NODE_W) + PAD * 2,
        height: PAD * 2 + maxDepth * ROW_Y + NODE_H,
    };
}