import PacketForm from "@/components/simulator/PacketForm";

export default function SimulatorPage() {
    return (
        <section className="view" aria-labelledby="h-simulator">
            <div className="page-head">
                <div>
                    <h1 id="h-simulator">Packet simulator</h1>
                    <p className="sub">Describe one packet and see whether the router&apos;s ACLs permit or deny it.</p>
                </div>
            </div>
            <PacketForm />
        </section>
    );
}