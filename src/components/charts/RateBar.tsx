export function RateBar({ value, kind }: { value: number; kind: "pick" | "win" }) {
  const width = kind === "pick" ? Math.min(value * 3, 100) : Math.min(value, 100);
  return <span className="rate"><span className={`rate-track ${kind}`}><span style={{ width: `${width}%` }} /></span><strong>{value.toFixed(2)}%</strong></span>;
}
