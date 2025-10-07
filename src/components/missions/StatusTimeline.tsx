import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StatusTimeline({ missionId }: { missionId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("mission_status_log")
      .select("*")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [missionId]);
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.id} className="border rounded p-2">
          <div className="text-sm">{r.created_at}</div>
          <div className="font-medium">{r.from_status} → {r.to_status}</div>
          <div className="text-sm opacity-80">via {r.via}{r.note ? ` — ${r.note}` : ""}</div>
        </div>
      ))}
    </div>
  );
}
