"use client";

import { useMemo, useState } from "react";
import DeviceInspector from "@/components/topology/DeviceInspector";
import TopologyMap from "@/components/topology/TopologyMap";
import RouterTools from "@/components/routers/RouterTools";
import StatusPill from "@/components/ui/StatusPill";
import { useNow } from "@/hooks/useNow";
import { useTopologyQuery } from "@/hooks/useTopologyQuery";
import { notify } from "@/lib/notify";
import { isRouterNode, nodeKind, routerIdFor } from "@/lib/routers";
import { formatTime } from "@/lib/status";

const REFRESH_SECONDS = 15;

export default function TopologyPage() {
    const topology = useTopologyQuery();
    const { data } = topology;
    const now = useNow(1000);
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [routerOverride, setRouterOverride] = useState<string | null>(null);

    const nodes = useMemo(() => data?.nodes ?? [], [data]);
    const links = useMemo(() => data?.links ?? [], [data]);

    const selectedId = useMemo(() => {
        if (pickedId && nodes.some((n) => n.node_id === pickedId)) return pickedId;
        return (nodes.find(isRouterNode) ?? nodes[0])?.node_id ?? null;
    }, [pickedId, nodes]);
    const selected = nodes.find((n) => n.node_id === selectedId) ?? null;

    const neighbours = useMemo(() => {
        if (!selectedId) return [];
        const ids = links
            .filter((l) => l.endpoints.includes(selectedId))
            .map((l) => (l.endpoints[0] === selectedId ? l.endpoints[1] : l.endpoints[0]));
        return ids.flatMap((id) => nodes.filter((n) => n.node_id === id));
    }, [links, nodes, selectedId]);

    const nameOf = (id: string) => nodes.find((n) => n.node_id === id)?.name ?? id;
    const defaultRouter = (() => {
        const first = nodes.find(isRouterNode);
        return first ? routerIdFor(first) : "R_HQ_IP";
    })();
    const routerName = routerOverride ?? defaultRouter;

    const next = data
        ? Math.max(0, REFRESH_SECONDS - Math.floor((now - topology.dataUpdatedAt) / 1000))
        : REFRESH_SECONDS;
    const progress = topology.isFetching ? 100 : ((REFRESH_SECONDS - next) / REFRESH_SECONDS) * 100;

    function useRouter(id: string) {
        setRouterOverride(id);
        notify("info", "Router selected", `${id} is ready in router operations.`);
        document.getElementById("router-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (topology.isPending) {
        return (
            <section className="view">
                <div className="page-head"><h1>Network topology</h1></div>
                <p className="empty" role="status">Connecting to topology API...</p>
            </section>
        );
    }

    if (!data) {
        return (
            <section className="view" aria-live="polite">
                <div className="page-head"><h1>Topology unavailable</h1></div>
                <div className="panel">
                    <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <p className="err" role="alert"><i className="gl" /><span>{topology.error?.message}</span></p>
                        <div className="btn-row">
                            <button className="btn btn-primary" type="button" onClick={() => void topology.refetch()}>
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="view" aria-labelledby="h-topology">
            <div className="page-head">
                <div>
                    <h1 id="h-topology">Network topology</h1>
                    <p className="sub">
                        Project <span className="mono">{data.project_name}</span>{" "}
                        <StatusPill level="ok" label={data.status.toUpperCase()} />
                    </p>
                </div>
                <div className="head-actions">
                    <div className="rf" role="status">
                        <span>
                            {topology.isFetching
                                ? "Refreshing"
                                : `Updated ${formatTime(topology.dataUpdatedAt)}. Next in ${next}s`}
                        </span>
                        <span className="rf-bar" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
                    </div>
                    <button
                        className="btn"
                        type="button"
                        disabled={topology.isFetching}
                        data-loading={topology.isFetching ? "true" : "false"}
                        onClick={() => void topology.refetch()}
                    >
                        Refresh now
                    </button>
                </div>
            </div>

            {topology.isError && (
                <div className="notice k-warn" role="status">
                    <i className="gl" />
                    <span>Refresh failed: {topology.error.message} Showing topology from {formatTime(topology.dataUpdatedAt)}.</span>
                </div>
            )}

            <div className="split">
                <div className="panel">
                    <div className="panel-head"><h2>Lab map</h2><span className="meta">Select a device to inspect it</span></div>
                    <TopologyMap nodes={nodes} links={links} selectedId={selectedId} onSelect={setPickedId} />
                </div>
                {selected && (
                    <DeviceInspector node={selected} neighbours={neighbours} onPick={setPickedId} onUseRouter={useRouter} />
                )}
            </div>

            <div className="grid cols-2">
                <div className="panel">
                    <div className="panel-head"><h2>Devices</h2><span className="meta">{nodes.length} devices</span></div>
                    <div className="tbl-wrap">
                        <table>
                            <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Console</th></tr></thead>
                            <tbody>
                                {nodes.map((n) => {
                                    const on = n.status === "started";
                                    return (
                                        <tr key={n.node_id} aria-current={n.node_id === selectedId ? "true" : undefined}>
                                            <td>
                                                <button className="linkbtn" type="button" onClick={() => setPickedId(n.node_id)}>{n.name}</button>
                                            </td>
                                            <td>{nodeKind(n.type)}</td>
                                            <td><StatusPill level={on ? "ok" : "info"} label={on ? "RUNNING" : "STOPPED"} /></td>
                                            <td className="num">{n.console_port ?? "None"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-head"><h2>Links</h2><span className="meta">{links.length} links</span></div>
                    <div className="tbl-wrap">
                        <table>
                            <thead><tr><th>Between</th><th>Link ID</th></tr></thead>
                            <tbody>
                                {links.length === 0 ? (
                                    <tr><td colSpan={2} className="empty">No links in this project.</td></tr>
                                ) : (
                                    links.map((l) => (
                                        <tr key={l.link_id}>
                                            <td className="num">{nameOf(l.endpoints[0])} <span className="muted">to</span> {nameOf(l.endpoints[1])}</td>
                                            <td className="num">{l.link_id.slice(0, 8)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <RouterTools routerName={routerName} onRouterNameChange={setRouterOverride} />
        </section>
    );
}