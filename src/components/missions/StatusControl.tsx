import { useMemo, useState } from "react";
import { setMissionStatus } from "@/api/missions.setStatus";

type Props = {
  mission: { id: string; status: string };
  allowedTransitions?: string[];
  onChanged?: () => void;
};

const LINEAR_FLOW = [
  "BROUILLON","PUBLIEE","ACCEPTEE","PLANIFIEE",
  "EN_ROUTE","EN_INTERVENTION","TERMINEE",
  "FACTURABLE","FACTUREE","PAYEE","CLOTUREE"
];

export default function StatusControl({ mission, allowedTransitions, onChanged }: Props) {
  const [loading, setLoading] = useState(false);

  const next = useMemo(() => {
    const i = LINEAR_FLOW.indexOf(mission.status);
    return i >= 0 && i < LINEAR_FLOW.length - 1 ? LINEAR_FLOW[i + 1] : null;
  }, [mission.status]);

  const others = useMemo(() => {
    if (allowedTransitions && allowedTransitions.length) {
      return allowedTransitions.filter(s => s !== next);
    }
    const fallback = ["ANNULEE"];
    if (mission.status === "PLANIFIEE") fallback.push("ACCEPTEE");
    if (mission.status === "EN_INTERVENTION") fallback.push("PLANIFIEE");
    return fallback;
  }, [allowedTransitions, mission.status, next]);

  async function apply(toStatus: string, note?: string) {
    setLoading(true);
    try {
      await setMissionStatus({ missionId: mission.id, toStatus: toStatus as any, note });
      onChanged?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {next && (
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          onClick={() => apply(next)}
          disabled={loading}
        >
          Étape suivante : {next}
        </button>
      )}
      <div className="relative">
        <details>
          <summary className="cursor-pointer px-2 py-1 border rounded">Plus d'actions</summary>
          <div className="mt-2 bg-white border rounded shadow p-2 min-w-[220px]">
            {others.map(o => (
              <button key={o} className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                onClick={() => apply(o)}>
                {o}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
