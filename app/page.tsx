"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import StatusPill from "@/components/ui/StatusPill";
import ApiPill from "@/components/ui/ApiPill";
import { useApiState } from "@/hooks/useHealthQuery";
import { useTopologyQuery } from "@/hooks/useTopologyQuery";
import { API_BASE_URL } from "@/lib/api";
import { describeError, notify } from "@/lib/notify";
import { routerIdFor, routerNodes } from "@/lib/routers";
import { formatTime, statusLevel } from "@/lib/status";
import { auditRouter } from "@/services/routerApi";
import { useAppStore, type Level } from "@/store/useAppStore";

const RANK: Record<Level, number> = { ok: 0, info: 1, warn: 2, crit: 3 };
const LEGEND: Record<Level, string> = { crit: "at risk", warn: "warning", ok: "secure", info: "not audited" };
const ORDER: Level[] = ["crit", "warn", "ok", "info"];

export default function OverviewPage() {
    const api = useApiState();
    const topology = useTopologyQuery();
    const audits = useAppStore((state) => state.audits);
    const activity = useAppStore((state) => state.telemetryLogs);
    const [busy, setBusy] = useState<Set<string>>(new Set());
    const [auditingAll, setAuditingAll] = useState(false);

    const rows = useMemo(
        () =>
            (topology.data ? routerNodes(topology.data.nodes) : []).map((node) => ({
                name: node.name,
                id: routerIdFor(node),
            })),
        [topology.data],
    );

    const counts: Record<Level, number> = { crit: 0, warn: 0, ok: 0, info: 0 };
    let findings = 0;
    let audited = 0;
    let worst: { level: Level; label: string } | null = null;
    for (const row of rows) {
        const record = audits[row.id];
        if (!record) {
            counts.info += 1;
            continue;
        }
        audited += 1;
        const level = statusLevel(record.result.overall_status);
        counts[level] += 1;
        findings += record.result.vulnerabilities.length;
        if (!worst || RANK[level] > RANK[worst.level]) {
            worst = { level, label: record.result.overall_status };
        }
    }

    const postureLevel: Level = worst?.level ?? "info";
    const postureWord = worst ? worst.label.toUpperCase() : "UNKNOWN";
    let note: string;
    if (rows.length === 0) {
        note = topology.isPending ? "Loading routers from the topology." : "No routers were found in the topology.";
    } else if (audited === 0) {
        note = `Run an audit to see the posture of ${rows.length} router${rows.length === 1 ? "" : "s"}.`;
    } else if (counts.crit + counts.warn === 0) {
        note = `${audited} of ${rows.length} routers audited. None need attention.`;
    } else {
        note = `${audited} of ${rows.length} routers audited. ${counts.crit + counts.warn} need attention, with ${findings} open finding${findings === 1 ? "" : "s"}.`;
    }

    async function runAudit(id: string, quiet: boolean) {
        setBusy((current) => new Set(current).add(id));
        try {
            await auditRouter(id, { quiet });
        } finally {
            setBusy((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
        }
    }

    async function auditAll() {
        setAuditingAll(true);
        const results = await Promise.allSettled(rows.map((row) => runAudit(row.id, true)));
        const failed = results.filter((result) => result.status === "rejected").length;
        const done = rows.length - failed;
        if (failed > 0) {
            notify("warn", "Audit finished with errors", `${done} of ${rows.length} routers audited. ${failed} failed. See recent activity.`);
        } else {
            notify("ok", "Audit finished", `${done} router${done === 1 ? "" : "s"} checked.`);
        }
        setAuditingAll(false);
    }

    async function recheck() {
        const result = await api.recheck();
        if (result.isError) {
            notify("crit", "API unreachable", describeError(result.error).message);
        } else {
            notify("ok", "API online", `The backend answered in ${result.data?.latency ?? "?"} ms.`);
        }
    }

    return (
        <section className="view" aria-labelledby="h-overview">
            <div className="page-head">
                <div>
                    <h1 id="h-overview">Security overview</h1>
                    <p className="sub">
                        {topology.data ? (
                            <>Lab project <span className="mono">{topology.data.project_name}</span>. </>
                        ) : null}
                        Posture is taken from the latest audit of each router.
                    </p>
                </div>
                <div className="head-actions">
                    <button
                        className="btn btn-primary"
                        type="button"
                        disabled={auditingAll || rows.length === 0}
                        data-loading={auditingAll ? "true" : "false"}
                        onClick={() => void auditAll()}
                    >
                        Audit all routers
                    </button>
                </div>
            </div>

            <div className={`panel posture k-${postureLevel}`}>
                <div className="posture-main">
                    <div className="posture-label"><i className="gl" />Network posture</div>
                    <div>
                        <div className="posture-word">{postureWord}</div>
                        <p className="posture-note" style={{ marginTop: 14 }}>{note}</p>
                    </div>
                </div>
                <div className="posture-side">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="seg" role="img" aria-label="Routers by audit status">
                            {ORDER.filter((level) => counts[level] > 0).map((level) => (
                                <span key={level} className={`k-${level}`} style={{ "--n": counts[level] } as CSSProperties} />
                            ))}
                        </div>
                        <div className="legend">
                            {ORDER.map((level) => (
                                <span key={level} className={`k-${level}`}>
                                    <i className="gl" />
                                    {counts[level]} {LEGEND[level]}
                                </span>
                            ))}
                        </div>
                    </div>
                    {topology.isError && !topology.data ? (
                        <p className="err" role="alert"><i className="gl" /><span>Router list unavailable. {topology.error.message}</span></p>
                    ) : rows.length === 0 ? (
                        <p className="empty">{topology.isPending ? "Loading routers..." : "No routers to audit."}</p>
                    ) : (
                        <ul className="audit-list">
                            {rows.map((row) => {
                                const record = audits[row.id];
                                const count = record?.result.vulnerabilities.length ?? 0;
                                return (
                                    <li key={row.id}>
                                        <div>
                                            <span className="rname">{row.name}</span>
                                            <span className="rsub">
                                                {row.id}
                                                {record
                                                    ? ` · ${count} finding${count === 1 ? "" : "s"} at ${record.result.management_ip ?? "unknown IP"}`
                                                    : " · not audited yet"}
                                            </span>
                                        </div>
                                        {record ? (
                                            <StatusPill level={statusLevel(record.result.overall_status)} label={record.result.overall_status} />
                                        ) : (
                                            <StatusPill level="info" label="NOT AUDITED" />
                                        )}
                                        <button
                                            className="btn btn-sm"
                                            type="button"
                                            disabled={busy.has(row.id)}
                                            data-loading={busy.has(row.id) ? "true" : "false"}
                                            onClick={() => void runAudit(row.id, false).catch(() => undefined)}
                                        >
                                            Audit
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className="grid cols-2">
                <div className="panel">
                    <div className="panel-head">
                        <h2>Backend connection</h2>
                        <span className="meta">{api.checkedAt ? `Checked ${formatTime(api.checkedAt)}` : "Not checked yet"}</span>
                    </div>
                    <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                            <ApiPill />
                            <p style={{ marginTop: 10, color: "var(--fg-2)" }}>
                                {api.state === "online"
                                    ? "The backend answered the health check."
                                    : api.state === "offline"
                                        ? "The backend did not answer. Start it, then check again."
                                        : "Contacting the backend."}
                            </p>
                        </div>
                        <dl className="kv">
                            <dt>API origin</dt><dd>{API_BASE_URL}</dd>
                            <dt>Health check</dt><dd>GET /</dd>
                            <dt>Response time</dt><dd>{api.state === "online" && api.latency ? `${api.latency} ms` : "n/a"}</dd>
                        </dl>
                        <div className="btn-row">
                            <button
                                className={`btn${api.state === "offline" ? " btn-primary" : ""}`}
                                type="button"
                                disabled={api.isFetching}
                                data-loading={api.isFetching ? "true" : "false"}
                                onClick={() => void recheck()}
                            >
                                Check connection
                            </button>
                        </div>
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-head"><h2>Recent activity</h2><span className="meta">Latest 8 events this session</span></div>
                    {activity.length === 0 ? (
                        <p className="empty" style={{ padding: "16px 18px" }}>Activity from this session appears here.</p>
                    ) : (
                        <ul className="log">
                            {activity.slice(0, 8).map((entry) => (
                                <li key={`${entry.timestamp}-${entry.message}`} className={`k-${entry.level}`}>
                                    <time>{formatTime(entry.timestamp)}</time>
                                    <i className="gl" />
                                    <p>{entry.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="grid cols-2">
                <div className="panel">
                    <Link className="link-row" href="/topology">
                        <div><h3>Network topology</h3><p>Devices, links, and router operations for the lab project.</p></div>
                        <span className="go">Open topology</span>
                    </Link>
                </div>
                <div className="panel">
                    <Link className="link-row" href="/simulator">
                        <div><h3>Packet simulator</h3><p>Test a packet against a router&apos;s ACLs before you change them.</p></div>
                        <span className="go">Open simulator</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}