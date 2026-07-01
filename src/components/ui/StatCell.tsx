export function StatCell({ value, emphasis = false }: { value: number; emphasis?: boolean }) {
  return <span className={`stat-cell${emphasis ? " is-emphasis" : ""}`}>{value.toFixed(2)}%</span>;
}
