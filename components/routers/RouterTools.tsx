"use client";

import { useMemo, useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { useTopologyQuery } from "@/hooks/useTopologyQuery";
import { describeError, notify } from "@/lib/notify";
import { routerIdFor, routerNodes } from "@/lib/routers";
import { formatTime, severityLevel, statusLevel } from "@/lib/status";
import { auditRouter, loadRouterState, syncRouter } from "@/services/routerApi";
import type { AuditResponse, RouterState, RouterSyncResponse } from "@/schemas/apiSchema";

type Action = "sync" | "state" | "audit";

interface Props {
    routerName: string;
    onRouterNameChange: (name: string) => void;
}

function SlotError({ message }: { message: string }) {
    return (
        <p className="err" role="alert"><i className="gl" /><span>{message}</span></p>
    );
}

export default function RouterTools({ routerName, onRouterNameChange }: Props) {
    const { data } = useTopologyQuery();
    const options = useMemo(
        () => (data ? routerNodes(data.nodes).map(routerIdFor) : []),
        [data],
    );

    const [busy, setBusy] = useState<Action | null>(null);
    const [sync, setSync] = useState<RouterSyncResponse | null>(null);
    const [state, setState] = useState<RouterState | null>(null);
    const [audit, setAudit] = useState<AuditResponse | null>(null);
    const [errors, setErrors] = useState<Partial<Record<Action, string>>>({});

    const name = routerName.trim();

    async function run(action: Action) {
        if (!name) {
            notify("warn", "Enter a router name", "Type a router such as R_HQ_IP before running an operation.");
            return;
        }
        setBusy(action);
        setErrors((e) => ({ ...e, [action]: undefined }));
        try {
            if (action === "sync") setSync(await syncRouter(name));
            else if (action === "state") setState(await loadRouterState(name));
            else setAudit(await auditRouter(name));
        } catch (error: unknown) {
            // The service already raised a toast and logged it.
            setErrors((e) => ({ ...e, [action]: describeError(error).message }));
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="panel" id="router-tools">
            <div className="panel-head">
                <h2>Router operations</h2>
                <span className="meta">Sync, read cached state, or audit one router</span>
            </div>
            <div className="panel-body">
                <div className="rt-bar">
                    <div className="field">
                        <label htmlFor="rt-name">Router</label>
                        <input
                            className="input"
                            id="rt-name"
                            list="router-list"
                            value={routerName}
                            onChange={(e) => onRouterNameChange(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <datalist id="router-list">
                            {options.map((o) => <option key={o} value={o} />)}
                        </datalist>
                    </div>
                    <div className="btn-row">
                        {([
                            ["sync", "Sync router", "btn btn-primary"],
                            ["state", "Load state", "btn"],
                            ["audit", "Run audit", "btn"],
                        ] as const).map(([action, label, cls]) => (
                            <button
                                key={action}
                                className={cls}
                                type="button"
                                disabled={busy !== null}
                                data-loading={busy === action ? "true" : "false"}
                                onClick={() => void run(action)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="slots">
                    <div className="slot">
                        <h3>Last sync</h3>
                        <div aria-live="polite">
                            {errors.sync ? <SlotError message={errors.sync} /> : sync ? (
                                <>
                                    <div className="stat-row">
                                        <div className="stat"><b>{sync.interfaces_count}</b><span>interfaces</span></div>
                                        <div className="stat"><b>{sync.acls_count}</b><span>ACLs</span></div>
                                    </div>
                                    <p className="hint"><span className="mono">{sync.router}</span> synced at {formatTime(sync.last_synced)}</p>
                                </>
                            ) : <p className="empty">Sync a router to see its interface and ACL counts.</p>}
                        </div>
                    </div>

                    <div className="slot">
                        <h3>Audit</h3>
                        <div aria-live="polite">
                            {errors.audit ? <SlotError message={errors.audit} /> : audit ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <StatusPill level={statusLevel(audit.overall_status)} label={audit.overall_status} />{" "}
                                        <span className="hint">Management IP <span className="mono">{audit.management_ip ?? "unknown"}</span></span>
                                    </div>
                                    {audit.vulnerabilities.length === 0 ? (
                                        <p className="empty">No vulnerabilities reported.</p>
                                    ) : (
                                        <ul className="vuln">
                                            {audit.vulnerabilities.map((v, i) => (
                                                <li key={`${v.type}-${i}`} className={`k-${severityLevel(v.severity)}`}>
                                                    <i className="gl" />
                                                    <div>
                                                        <b>{v.type}{v.severity && <StatusPill level={severityLevel(v.severity)} label={v.severity.toUpperCase()} />}</b>
                                                        {v.description && <span className="d">{v.description}</span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : <p className="empty">Run an audit to list vulnerabilities and overall status.</p>}
                        </div>
                    </div>

                    <div className="slot wide">
                        <h3>Cached state</h3>
                        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {errors.state ? <SlotError message={errors.state} /> : state ? (
                                <>
                                    <p className="hint">
                                        <span className="mono">{state.router}</span> at {state.host_ip ?? "unknown IP"}, last synced {formatTime(state.last_synced)}
                                    </p>
                                    {state.vty_security && (
                                        <div className="row">
                                            <span className="hint">VTY lines</span>
                                            {state.vty_security.vty_found === false ? (
                                                <StatusPill level="info" label="NOT FOUND" />
                                            ) : state.vty_security.protected ? (
                                                <StatusPill level="ok" label={`PROTECTED${state.vty_security.access_class ? ` (${state.vty_security.access_class})` : ""}`} />
                                            ) : (
                                                <StatusPill level="crit" label="UNPROTECTED" />
                                            )}
                                        </div>
                                    )}
                                    <div className="tbl-wrap">
                                        <table>
                                            <thead><tr><th>Interface</th><th>IP address</th><th>VLAN</th><th>ACL in</th><th>ACL out</th></tr></thead>
                                            <tbody>
                                                {state.interfaces.map((i) => (
                                                    <tr key={i.name}>
                                                        <td className="num">{i.name}</td>
                                                        <td className="num">{i.ip_address ? `${i.ip_address}${i.subnet_mask ? ` / ${i.subnet_mask}` : ""}` : "None"}</td>
                                                        <td className="num">{i.vlan_id ?? "None"}</td>
                                                        <td className="num">{i.acl_in ?? "None"}</td>
                                                        <td className="num">{i.acl_out ?? "None"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {state.acls.map((acl) => (
                                        <details key={acl.name}>
                                            <summary>ACL {acl.name} ({acl.type ?? "unknown type"}, {acl.rules.length} rules)</summary>
                                            <div className="tbl-wrap">
                                                <table>
                                                    <thead><tr><th>Seq</th><th>Rule</th></tr></thead>
                                                    <tbody>
                                                        {acl.rules.map((r) => (
                                                            <tr key={r.sequence}>
                                                                <td className="num">{r.sequence}</td>
                                                                <td className="num">{r.action} {r.protocol} {r.source} {r.source_wildcard ?? ""} to {r.destination} {r.destination_wildcard ?? ""}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    ))}
                                    <details>
                                        <summary>Show state as JSON</summary>
                                        <pre className="code">{JSON.stringify(state, null, 2)}</pre>
                                    </details>
                                </>
                            ) : <p className="empty">Load state to read interfaces, ACLs, and VTY security.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}