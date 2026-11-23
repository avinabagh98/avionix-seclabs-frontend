"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { useDebounced } from "@/hooks/useDebounced";
import { useTopologyQuery } from "@/hooks/useTopologyQuery";
import { apiClient } from "@/lib/api";
import { notify } from "@/lib/notify";
import { routerIdFor, routerNodes } from "@/lib/routers";
import { formatTime, statusLevel } from "@/lib/status";
import type { SimulatorEvaluation, SimulatorEvaluationPayload } from "@/schemas/apiSchema";
import { evaluatePacket } from "@/services/simulatorApi";
import { syncRouter } from "@/services/routerApi";

const DEFAULTS: SimulatorEvaluationPayload = {
    router: "R_HQ_IP",
    interface: "FastEthernet0/0.20",
    direction: "out",
    source_ip: "10.20.30.50",
    destination_ip: "10.10.20.50",
    protocol: "ip",
};

type Errors = Partial<Record<"router" | "interface" | "source_ip" | "destination_ip", string>>;
interface HistoryItem { payload: SimulatorEvaluationPayload; result: SimulatorEvaluation; at: number }

function ipOk(value: string): boolean {
    const parts = value.split(".");
    return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function validate(form: SimulatorEvaluationPayload): Errors {
    const errors: Errors = {};
    if (!form.router.trim()) errors.router = "Enter a router name.";
    if (!form.interface.trim()) errors.interface = "Enter an interface such as FastEthernet0/0.20.";
    if (!ipOk(form.source_ip.trim())) errors.source_ip = "Use an IPv4 address such as 10.20.30.50.";
    if (!ipOk(form.destination_ip.trim())) errors.destination_ip = "Use an IPv4 address such as 10.10.20.50.";
    return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;
    return <span className="err" id={id}><i className="gl" />{message}</span>;
}

export default function PacketForm() {
    const queryClient = useQueryClient();
    const topology = useTopologyQuery();
    const [form, setForm] = useState<SimulatorEvaluationPayload>(DEFAULTS);
    const [errors, setErrors] = useState<Errors>({});
    const [evaluating, setEvaluating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [shown, setShown] = useState<HistoryItem | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const router = useDebounced(form.router.trim(), 400);
    const stateQuery = useQuery({
        queryKey: ["router-state", router],
        queryFn: () => apiClient.getRouterState(router),
        enabled: router.length > 0,
        retry: false,
        staleTime: 30_000,
    });
    const cached = stateQuery.data;

    const routerOptions = useMemo(
        () => (topology.data ? routerNodes(topology.data.nodes).map(routerIdFor) : []),
        [topology.data],
    );

    const boundAcl = useMemo(() => {
        const iface = cached?.interfaces.find((i) => i.name === form.interface.trim());
        if (!iface) return null;
        return (form.direction === "in" ? iface.acl_in : iface.acl_out) ?? null;
    }, [cached, form.interface, form.direction]);

    const knownInterface = !cached || cached.interfaces.some((i) => i.name === form.interface.trim());

    function update<K extends keyof SimulatorEvaluationPayload>(key: K, value: SimulatorEvaluationPayload[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length > 0) {
            notify("warn", "Check the packet", "Fix the marked fields, then evaluate again.");
            return;
        }
        const payload: SimulatorEvaluationPayload = {
            router: form.router.trim(),
            interface: form.interface.trim(),
            direction: form.direction,
            source_ip: form.source_ip.trim(),
            destination_ip: form.destination_ip.trim(),
            protocol: form.protocol,
        };
        setEvaluating(true);
        try {
            const result = await evaluatePacket(payload);
            const item = { payload, result, at: Date.now() };
            setShown(item);
            setHistory((h) => [item, ...h].slice(0, 5));
        } catch {
            // Toast and activity entry were raised by the service.
        } finally {
            setEvaluating(false);
        }
    }

    async function onSync() {
        const name = form.router.trim();
        if (!name) {
            setErrors({ router: "Enter a router name." });
            return;
        }
        setErrors({});
        setSyncing(true);
        try {
            await syncRouter(name);
            await queryClient.invalidateQueries({ queryKey: ["router-state", name] });
        } catch {
            // Reported by the service.
        } finally {
            setSyncing(false);
        }
    }

    function onReset() {
        setForm(DEFAULTS);
        setErrors({});
        setShown(null);
        notify("info", "Form reset", "The packet is back to the sample values.");
    }

    function loadItem(item: HistoryItem) {
        setForm(item.payload);
        setErrors({});
        setShown(item);
        notify("info", "Packet loaded", "The form now holds the selected evaluation.");
    }

    const matchedAcl = shown ? cached?.acls.find((a) => a.name === shown.result.matched_acl) : undefined;

    return (
        <>
            <div className="split split-eq">
                <form className="panel" onSubmit={(e) => void onSubmit(e)} noValidate>
                    <div className="panel-head"><h2>Packet</h2><span className="meta">Addresses plus where the packet meets the router</span></div>
                    <div className="panel-body">
                        <div className="form-grid">
                            <div className="field">
                                <label htmlFor="sim-router">Router</label>
                                <input className="input" id="sim-router" list="sim-router-list" value={form.router}
                                    onChange={(e) => update("router", e.target.value)} autoComplete="off" spellCheck={false}
                                    aria-invalid={errors.router ? "true" : "false"} aria-describedby="e-sim-router" />
                                <datalist id="sim-router-list">{routerOptions.map((o) => <option key={o} value={o} />)}</datalist>
                                <FieldError id="e-sim-router" message={errors.router} />
                            </div>
                            <div className="field">
                                <label htmlFor="sim-iface">Interface</label>
                                <input className="input" id="sim-iface" list="sim-iface-list" value={form.interface}
                                    onChange={(e) => update("interface", e.target.value)} autoComplete="off" spellCheck={false}
                                    aria-invalid={errors.interface ? "true" : "false"} aria-describedby="e-sim-iface" />
                                <datalist id="sim-iface-list">{cached?.interfaces.map((i) => <option key={i.name} value={i.name} />)}</datalist>
                                <FieldError id="e-sim-iface" message={errors.interface} />
                            </div>
                            <div className="field">
                                <label htmlFor="sim-dir">Direction</label>
                                <select className="input" id="sim-dir" value={form.direction}
                                    onChange={(e) => update("direction", e.target.value as "in" | "out")}>
                                    <option value="in">in</option>
                                    <option value="out">out</option>
                                </select>
                            </div>
                            <div className="field">
                                <label htmlFor="sim-proto">Protocol</label>
                                <select className="input" id="sim-proto" value={form.protocol}
                                    onChange={(e) => update("protocol", e.target.value as SimulatorEvaluationPayload["protocol"])}>
                                    <option value="ip">ip</option>
                                    <option value="tcp">tcp</option>
                                    <option value="udp">udp</option>
                                    <option value="icmp">icmp</option>
                                </select>
                            </div>
                            <div className="field">
                                <label htmlFor="sim-src">Source IP</label>
                                <input className="input" id="sim-src" value={form.source_ip} inputMode="decimal" autoComplete="off"
                                    onChange={(e) => update("source_ip", e.target.value)}
                                    aria-invalid={errors.source_ip ? "true" : "false"} aria-describedby="e-sim-src" />
                                <FieldError id="e-sim-src" message={errors.source_ip} />
                            </div>
                            <div className="field">
                                <label htmlFor="sim-dst">Destination IP</label>
                                <input className="input" id="sim-dst" value={form.destination_ip} inputMode="decimal" autoComplete="off"
                                    onChange={(e) => update("destination_ip", e.target.value)}
                                    aria-invalid={errors.destination_ip ? "true" : "false"} aria-describedby="e-sim-dst" />
                                <FieldError id="e-sim-dst" message={errors.destination_ip} />
                            </div>
                            <p className="hint full">
                                {stateQuery.isFetching
                                    ? "Reading cached state for this router."
                                    : stateQuery.isError
                                        ? "No cached state for this router yet. Sync it to get interface suggestions."
                                        : !knownInterface
                                            ? `This interface is not in the cached state of ${router}. Pick one from the list.`
                                            : cached
                                                ? boundAcl
                                                    ? `ACL ${boundAcl} is bound to this interface ${form.direction}.`
                                                    : `No ACL is bound to this interface ${form.direction}.`
                                                : "Enter a router to load its interfaces."}
                            </p>
                        </div>
                        <div className="btn-row" style={{ marginTop: 20 }}>
                            <button className="btn btn-primary" type="submit" disabled={evaluating || syncing}
                                data-loading={evaluating ? "true" : "false"}>Evaluate packet</button>
                            <button className="btn" type="button" disabled={evaluating || syncing}
                                data-loading={syncing ? "true" : "false"} onClick={() => void onSync()}>Sync router</button>
                            <button className="btn btn-quiet" type="button" onClick={onReset}>Reset</button>
                        </div>
                    </div>
                </form>

                <div className="panel">
                    <div className="panel-head">
                        <h2>Verdict</h2>
                        <span className="meta">{shown ? `Evaluated ${formatTime(shown.at)}` : "Waiting for a packet"}</span>
                    </div>
                    <div className="panel-body verdict" aria-live="polite">
                        {!shown ? (
                            <div className="verdict-idle">
                                <h3 style={{ color: "var(--fg-2)" }}>No packet evaluated yet</h3>
                                <p>Fill in the packet and choose Evaluate packet. The verdict, matched rule, and reason appear here.</p>
                            </div>
                        ) : (
                            <>
                                <div className={`k-${statusLevel(shown.result.verdict)}`}>
                                    <div className="verdict-word"><i className="gl" />{shown.result.verdict}</div>
                                </div>
                                <div className="path">
                                    <span>{shown.payload.source_ip}</span><em>into</em>
                                    <span>{shown.payload.router} {shown.payload.interface} {shown.payload.direction}</span><em>to</em>
                                    <span>{shown.payload.destination_ip}</span><em>({shown.payload.protocol})</em>
                                </div>
                                <dl className="kv">
                                    <dt>Matched ACL</dt><dd>{shown.result.matched_acl ?? "None"}</dd>
                                    <dt>Sequence</dt><dd>{shown.result.matched_sequence ?? "None"}</dd>
                                    <dt>Reason</dt><dd style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>{shown.result.reason}</dd>
                                </dl>
                                {matchedAcl && (
                                    <div className="tbl-wrap">
                                        <table>
                                            <thead><tr><th>Seq</th><th>ACL {matchedAcl.name}</th></tr></thead>
                                            <tbody>
                                                {matchedAcl.rules.map((r) => (
                                                    <tr key={r.sequence} aria-current={r.sequence === shown.result.matched_sequence ? "true" : undefined}>
                                                        <td className="num">{r.sequence}</td>
                                                        <td className="num">{r.action} {r.protocol} {r.source} {r.source_wildcard ?? ""} to {r.destination} {r.destination_wildcard ?? ""}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel">
                <div className="panel-head"><h2>Recent evaluations</h2><span className="meta">Select one to load it into the form</span></div>
                {history.length === 0 ? (
                    <p className="empty" style={{ padding: "16px 18px" }}>Evaluated packets are listed here for this session.</p>
                ) : (
                    <ul className="hist">
                        {history.map((h) => (
                            <li key={h.at}>
                                <button type="button" onClick={() => loadItem(h)}>
                                    <StatusPill level={statusLevel(h.result.verdict)} label={h.result.verdict} />
                                    <span className="t">{h.payload.router} {h.payload.interface} {h.payload.direction}: {h.payload.source_ip} to {h.payload.destination_ip} {h.payload.protocol}</span>
                                    <span>{formatTime(h.at)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}