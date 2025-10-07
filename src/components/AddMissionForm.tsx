import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddMissionForm({ onAdded }: { onAdded?: () => void }) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<"Nouveau"|"En cours"|"Bloqué"|"Terminé">("Nouveau");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { error } = await supabase.from("missions").insert([{ title, owner, status }]);
      if (error) throw error;
      setTitle(""); setOwner(""); setStatus("Nouveau");
      onAdded?.();
    } catch (e:any) {
      setErr(e.message ?? "Erreur inconnue");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl shadow p-4 flex flex-wrap gap-2 items-end">
      <input className="border rounded px-3 py-2" placeholder="Titre"
             value={title} onChange={e=>setTitle(e.target.value)} required />
      <input className="border rounded px-3 py-2" placeholder="Responsable"
             value={owner} onChange={e=>setOwner(e.target.value)} required />
      <select className="border rounded px-3 py-2" value={status} onChange={e=>setStatus(e.target.value as any)}>
        <option>Nouveau</option><option>En cours</option><option>Bloqué</option><option>Terminé</option>
      </select>
      <button disabled={loading} className="px-3 py-2 border rounded">
        {loading ? "Ajout..." : "Ajouter"}
      </button>
      {err && <div className="text-sm text-red-600 ml-2">{err}</div>}
    </form>
  );
}
