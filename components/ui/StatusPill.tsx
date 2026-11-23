import type { Level } from "@/store/useAppStore";

interface Props {
    level: Level;
    label: string;
    pulse?: boolean;
}

export default function StatusPill({ level, label, pulse }: Props) {
    return (
        <span className={`pill k-${level}${pulse ? " pulse" : ""}`}>
            <i className="gl" />
            {label}
        </span>
    );
}