"use client";

import StatusPill from "@/components/ui/StatusPill";
import { isRouterNode, nodeKind, routerIdFor } from "@/lib/routers";
import type { TopologyNode } from "@/schemas/apiSchema";

interface Props {
    node: TopologyNode;
    neighbours: TopologyNode[];
    onPick: (id: string) => void;
    onUseRouter: (routerId: string) => void;
}

export default function DeviceInspector({ node, neighbours, onPick, onUseRouter }: Props) {
    const on = node.status === "started";
    const router = isRouterNode(node);

    return (
        <div className="panel">
            <div className="panel-head">
                <h2>{node.name}</h2>
                <StatusPill level={on ? "ok" : "info"} label={on ? "RUNNING" : "STOPPED"} />
            </div>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <dl className="kv">
                    <dt>Type</dt><dd>{nodeKind(node.type)} ({node.type})</dd>
                    <dt>Node ID</dt><dd>{node.node_id}</dd>
                    <dt>Console port</dt><dd>{node.console_port ?? "None"}</dd>
                    {router && (<><dt>Router ID</dt><dd>{routerIdFor(node)}</dd></>)}
                    <dt>Connected to</dt>
                    <dd>
                        {neighbours.length === 0
                            ? "Nothing"
                            : neighbours.map((n) => (
                                <div key={n.node_id}>
                                    <button className="linkbtn" type="button" onClick={() => onPick(n.node_id)}>
                                        {n.name}
                                    </button>
                                </div>
                            ))}
                    </dd>
                </dl>
                {router ? (
                    <div className="btn-row">
                        <button className="btn btn-primary" type="button" onClick={() => onUseRouter(routerIdFor(node))}>
                            Use in router operations
                        </button>
                    </div>
                ) : (
                    <p className="hint">Router operations are available for routers only.</p>
                )}
            </div>
        </div>
    );
}