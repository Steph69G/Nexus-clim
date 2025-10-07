import { useEffect, useState } from "react";

type Props = {
  value: { status?: "ALL" | "Nouveau" | "En cours" | "Bloqué" | "Terminé"; q?: string; owner?: string; };
  onChange: (v: Props["value"]) => void;
};

export default function MissionsFilters({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  // petit debounce pour la recherche
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col">
        <label className="text-xs">Statut</label>
        <select
          className="border rounded px-3 py-2"
          value={local.status ?? "ALL"}
          onChange={(e)=>setLocal(v=>({ ...v, status: e.target.value as any }))}
        >
          <option value="ALL">Tous</option>
          <option>Nouveau</option>
          <option>En cours</option>
          <option>Bloqué</option>
          <option>Terminé</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs">Responsable</label>
        <input
          className="border rounded px-3 py-2"
          placeholder="owner exact (optionnel)"
          value={local.owner ?? ""}
          onChange={(e)=>setLocal(v=>({ ...v, owner: e.target.value }))}
        />
      </div>

      <div className="flex flex-col grow min-w-[220px]">
        <label className="text-xs">Recherche</label>
        <input
          className="border rounded px-3 py-2"
          placeholder="titre / responsable"
          value={local.q ?? ""}
          onChange={(e)=>setLocal(v=>({ ...v, q: e.target.value }))}
        />
      </div>

      <button
        className="px-3 py-2 border rounded"
        onClick={()=> onChange({ status: "ALL", q: "", owner: "" })}
      >
        Réinitialiser
      </button>
    </div>
  );
}
