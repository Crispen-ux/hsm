interface SpecRowProps {
  parameter: string;
  value: string | null;
  unit: string | null;
}

export function SpecRow({ parameter, value, unit }: SpecRowProps) {
  return (
    <div className="flex items-baseline gap-3 py-3">
      <dt className="text-zinc-300">{parameter}</dt>
      <span className="spec-leader" aria-hidden />
      <dd className="text-right">
        {value === null ? (
          <span className="text-zinc-400">On request</span>
        ) : (
          <span className="font-mono tabular-nums text-zinc-50">
            {value}
            {unit ? <span className="ml-1 text-zinc-400">{unit}</span> : null}
          </span>
        )}
      </dd>
    </div>
  );
}
