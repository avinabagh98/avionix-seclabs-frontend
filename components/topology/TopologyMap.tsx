"use client";

import { useMemo } from "react";
import { layoutTopology, NODE_H, NODE_W } from "@/lib/layout";
import { nodeKind } from "@/lib/routers";
import type { TopologyLink, TopologyNode } from "@/schemas/apiSchema";

interface Props {
    nodes: TopologyNode[];
    links: TopologyLink[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function TopologyMap({ nodes, links, selectedId, onSelect }: Props) {
    const layout = useMemo(() => layoutTopology(nodes, links), [nodes, links]);
    const verticals = useMemo(() => {
        const xs: number[] = [];
        for (let x = 0; x <= layout.width; x += 40) xs.push(x);
        return xs;
    }, [layout.width]);
    const horizontals = useMemo(() => {
        const ys: number[] = [];
        for (let y = 0; y <= layout.height; y += 40) ys.push(y);
        return ys;
    }, [layout.height]);

    return (
        <div className="map-wrap">
            <svg
                className="map"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                style={{ minWidth: layout.width }}
                role="group"
                aria-label={`Network map of ${nodes.length} devices`}
            >
                {verticals.map((x) => (
                    <line key={`v${x}`} className="grid-line" x1={x} y1={0} x2={x} y2={layout.height} />
                ))}
                {horizontals.map((y) => (
                    <line key={`h${y}`} className="grid-line" x1={0} y1={y} x2={layout.width} y2={y} />
                ))}
                {layout.edges.map((edge) => {
                    const hot =
                        selectedId === edge.from.node.node_id || selectedId === edge.to.node.node_id;
                    return (
                        <line
                            key={edge.id}
                            className={`edge${hot ? " hot" : ""}`}
                            x1={edge.from.x}
                            y1={edge.from.y}
                            x2={edge.to.x}
                            y2={edge.to.y}
                        />
                    );
                })}
                {layout.nodes.map(({ node, x, y }) => {
                    const on = node.status === "started";
                    const selected = selectedId === node.node_id;
                    const label = node.name.length > 15 ? `${node.name.slice(0, 14)}…` : node.name;
                    const state = on ? "running" : "stopped";
                    return (
                        <g
                            key={node.node_id}
                            className={`node${on ? "" : " off"}${selected ? " sel" : ""}`}
                            transform={`translate(${x},${y})`}
                            tabIndex={0}
                            role="button"
                            aria-pressed={selected}
                            aria-label={`${node.name}, ${nodeKind(node.type)}, ${state}`}
                            onClick={() => onSelect(node.node_id)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onSelect(node.node_id);
                                }
                            }}
                        >
                            <title>{node.name}</title>
                            <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} rx={4} />
                            <circle className={on ? "dot-on" : "dot-off"} cx={-57} cy={-8} r={3.5} />
                            <text className="nm" x={-46} y={-4}>{label}</text>
                            <text className="st" x={-46} y={13}>
                                {nodeKind(node.type)} · {state}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}