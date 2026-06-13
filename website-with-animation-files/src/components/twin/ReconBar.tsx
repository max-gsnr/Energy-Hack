import { fmtEnergy } from "@/lib/twin/data";

export function ReconBar({ delivered, loss, curtailment, expected }: { delivered: number; loss: number; curtailment: number; expected: number }) {
  const dW = (delivered / expected) * 100;
  const lW = (loss / expected) * 100;
  const cW = (curtailment / expected) * 100;
  return (
    <div>
      <div className="flow-scan flex h-8 w-full overflow-hidden border border-hairline rounded-sm">
        <div className="bar-grow bg-foreground flex items-center justify-start px-2.5" style={{ width: `${dW}%` }}>
          <span className="num text-[10.5px] text-background uppercase tracking-wider">Delivered</span>
        </div>
        <div className="bar-grow border-l border-background flex items-center justify-center" style={{ width: `${Math.max(lW, 0.4)}%`, background: "var(--st-warning)", animationDelay: "120ms" }} title={`Performance loss ${fmtEnergy(loss)}`} />
        <div className="bar-grow border-l border-background" style={{ width: `${cW}%`, background: "var(--amber-soft)", animationDelay: "220ms" }} title={`Curtailment ${fmtEnergy(curtailment)}`} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] mono text-muted-foreground">
        <span>0</span>
        <span>{fmtEnergy(expected)} expected</span>
      </div>
    </div>
  );
}
