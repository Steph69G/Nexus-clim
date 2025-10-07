export default function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl shadow p-4">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs opacity-60 mt-2">{hint}</div>}
    </div>
  );
}
