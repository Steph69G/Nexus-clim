import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/ui/toast/ToastProvider";
import MissionEditModal from "./MissionEditModal";
import { publishMission } from "@/api/missions.publish";

// ---------------- Types ----------------
type Mission = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  address: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  scheduled_start: string | null;
  estimated_duration_min: number | null;
  price_total_cents: number | null;
  price_subcontractor_cents: number | null;
  currency: string | null;
  assigned_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// ---------------- Utils ----------------
const COLUMNS = [
  "id",
  "title",
  "type",
  "status",
  "city",
  "address",
  "zip",
  "lat",
  "lng",
  "description",
  "scheduled_start",
  "estimated_duration_min",
  "price_total_cents",
  "price_subcontractor_cents",
  "currency",
  "assigned_user_id",
  "created_at",
  "updated_at",
].join(",");

// Normalisation statuts → UI unique
type MissionStatus = "Nouveau" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé";
function normalizeStatus(input: string | null | undefined): MissionStatus {
  const s = (input ?? "Nouveau")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();

  switch (s) {
    case "PUBLIEE":
    case "PUBLISHED":
      return "Publiée";
    case "ASSIGNEE":
    case "ASSIGNED":
      return "Assignée";
    case "EN COURS":
    case "IN_PROGRESS":
    case "IN PROGRESS":
      return "En cours";
    case "BLOQUE":
    case "BLOQUEE":
    case "BLOCKED":
      return "Bloqué";
    case "TERMINE":
    case "TERMINEE":
    case "DONE":
    case "COMPLETED":
      return "Terminé";
    case "NOUVEAU":
    case "DRAFT":
    default:
      return "Nouveau";
  }
}
const isPublished = (s: string | null) => normalizeStatus(s) === "Publiée";

function cents(n: number | null, cur: string | null) {
  if (n == null) return "—";
  return `${(n / 100).toFixed(2)} ${cur ?? "EUR"}`;
}

// ---------------- Page ----------------
export default function AdminDashboard() {
  const { push } = useToast();

  // Data
  const [rows, setRows] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Mission | null>(null);

  // Filtres
  const [status, setStatus] = useState<
    "all" | "Publiée" | "Assignée" | "En cours" | "Bloqué" | "Terminé" | "draft"
  >("all");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Tri
  const [sortBy, setSortBy] = useState<keyof Mission>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    publiees: 0,    // Publiée
    assignees: 0,   // Assignée
    acceptees: 0,   // En cours (traitement)
    terminees: 0,   // Terminé
    brouillons: 0,  // Brouillons
  });

  // Publication state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ttlMinutes, setTtlMinutes] = useState<number>(30);
  const [includeEmployees, setIncludeEmployees] = useState<boolean>(false);

  // ---------------- Data loaders ----------------
  function buildBaseQuery() {
    let query = supabase.from("missions").select(COLUMNS, { count: "exact" });

    if (status === "draft") {
      query = query.or("status.is.null,status.eq.Nouveau,status.eq.BROUILLON_INCOMPLET");
    } else if (status !== "all") {
      query = query.eq("status", status);
    }
    if (q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`title.ilike.${like},description.ilike.${like},city.ilike.${like}`);
    }
    if (city.trim()) {
      query = query.ilike("city", `%${city.trim()}%`);
    }
    if (dateFrom) {
      query = query.gte("scheduled_start", dateFrom);
    }
    if (dateTo) {
      query = query.lte("scheduled_start", dateTo);
    }

    query = query.order(sortBy as string, { ascending: sortDir === "asc", nullsFirst: false });
    return query;
  }

  async function load() {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await buildBaseQuery().range(from, to);
      if (error) throw error;

      // ✅ normaliser les statuts pour l’UI
      const normalized = (data ?? []).map((m) => ({ ...m, status: normalizeStatus(m.status) })) as Mission[];
      setRows(normalized);
      setTotal(count ?? 0);
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur chargement missions" });
    } finally {
      setLoading(false);
    }
  }

  async function countByStatus(s: string) {
    let q1 = supabase.from("missions").select("id", { count: "exact", head: true });

    if (s === "draft") {
      q1 = q1.or("status.is.null,status.eq.Nouveau,status.eq.BROUILLON_INCOMPLET");
    } else {
      q1 = q1.eq("status", s);
    }

    if (q.trim()) {
      const like = `%${q.trim()}%`;
      q1 = q1.or(`title.ilike.${like},description.ilike.${like},city.ilike.${like}`);
    }
    if (city.trim()) q1 = q1.ilike("city", `%${city.trim()}%`);
    if (dateFrom) q1 = q1.gte("scheduled_start", dateFrom);
    if (dateTo) q1 = q1.lte("scheduled_start", dateTo);

    const { count } = await q1;
    return count ?? 0;
  }

  async function loadKpis() {
    try {
      let base = supabase.from("missions").select("id", { count: "exact", head: true });
      if (q.trim()) {
        const like = `%${q.trim()}%`;
        base = base.or(`title.ilike.${like},description.ilike.${like},city.ilike.${like}`);
      }
      if (city.trim()) base = base.ilike("city", `%${city.trim()}%`);
      if (dateFrom) base = base.gte("scheduled_start", dateFrom);
      if (dateTo) base = base.lte("scheduled_start", dateTo);

      const [{ count: totalCount }, p, a, b, t, d] = await Promise.all([
        base,
        countByStatus("Publiée"), // ✅ Publiée (et plus "En cours")
        countByStatus("Assignée"),
        countByStatus("En cours"),
        countByStatus("Terminé"),
        countByStatus("draft"),
      ]);

      setKpis({
        total: totalCount ?? 0,
        publiees: p ?? 0,
        assignees: a ?? 0,
        acceptees: b ?? 0,
        terminees: t ?? 0,
        brouillons: d ?? 0,
      });
    } catch {
      // soft-fail
    }
  }

  async function onPublish(m: Mission) {
    try {
      setPublishingId(m.id);
      await publishMission(m.id, { ttlMinutes, alsoEmployees: includeEmployees });
      push({ type: "success", message: "Mission publiée" });
      await load();
      await loadKpis();
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Publication échouée" });
    } finally {
      setPublishingId(null);
    }
  }

  async function onDelete(m: Mission) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la mission "${m.title}" ?\n\nCette action est irréversible.`)) {
      return;
    }
    try {
      setDeletingId(m.id);
      const { error } = await supabase.from("missions").delete().eq("id", m.id);
      if (error) throw error;

      push({ type: "success", message: "Mission supprimée avec succès" });
      await load();
      await loadKpis();
    } catch (e: any) {
      push({ type: "error", message: e?.message ?? "Erreur lors de la suppression" });
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------- Effects ----------------
  useEffect(() => {
    load();
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, city, dateFrom, dateTo, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-missions-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => {
        load();
        loadKpis();
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- Derived ----------------
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // ---------------- Handlers ----------------
  function resetFilters() {
    setStatus("all");
    setQ("");
    setCity("");
    setDateFrom("");
    setDateTo("");
    setSortBy("created_at");
    setSortDir("desc");
    setPage(1);
    setPageSize(10);
  }

  function toggleSort(col: keyof Mission) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-blue-200 shadow-xl mb-6">
            <span className="text-blue-600 text-xl">📊</span>
            <span className="text-sm font-medium text-blue-700">Administration</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Dashboard Admin
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Gérez et supervisez toutes vos missions depuis votre tableau de bord centralisé
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/admin/create"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-xl"
            >
              ➕
              + Nouvelle mission
            </a>
            <a
              href="/admin/offers"
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-medium transition-all transform hover:scale-105 shadow-lg"
            >
              📋 Offres publiées
            </a>
            <a
              href="/admin/map"
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-medium transition-all transform hover:scale-105 shadow-lg"
            >
              🗺️ Vue Carte
            </a>
            <button
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-medium transition-all disabled:opacity-50"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Chargement…" : "🔄 Rafraîchir"}
            </button>
            <button
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 font-medium transition-all"
              onClick={resetFilters}
            >
              ↺ Réinitialiser
            </button>
          </div>
        </header>

        {/* KPI - Cartes cliquables comme filtres */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <button
            onClick={() => { setStatus("all"); setPage(1); }}
            className={`bg-white border-2 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "all" ? "border-slate-900 ring-4 ring-slate-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-slate-900 mb-1">{kpis.total}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Total</div>
                <div className="text-sm text-slate-500">Missions filtrées</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setStatus("draft"); setPage(1); }}
            className={`bg-white border-2 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "draft" ? "border-slate-900 ring-4 ring-slate-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">📝</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-slate-600 mb-1">{kpis.brouillons}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Brouillons</div>
                <div className="text-sm text-slate-500">Non publiées</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setStatus("Publiée"); setPage(1); }} // ✅ filtre Publiée
            className={`bg-white border-2 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "Publiée" ? "border-blue-600 ring-4 ring-blue-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">📢</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-blue-600 mb-1">{kpis.publiees}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Publiées</div>
                <div className="text-sm text-slate-500">En attente d'assignation</div>
              </div>
            </div>
          </button>

          {/* Assignées */}
          <button
            onClick={() => { setStatus("Assignée"); setPage(1); }}
            className={`bg-white border-2 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "Assignée" ? "border-violet-600 ring-4 ring-violet-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🧭</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-violet-600 mb-1">{kpis.assignees}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Assignées</div>
                <div className="text-sm text-slate-500">Tech affecté</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setStatus("En cours"); setPage(1); }}
            className={`bg-white border-2 rounded-3xl p-8 shadow- xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "En cours" ? "border-orange-600 ring-4 ring-orange-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🔧</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-orange-600 mb-1">{kpis.acceptees}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">En cours</div>
                <div className="text-sm text-slate-500">Interventions démarrées</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setStatus("Terminé"); setPage(1); }}
            className={`bg-white border-2 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-left ${
              status === "Terminé" ? "border-emerald-600 ring-4 ring-emerald-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">✅</span>
              </div>
              <div className="flex-1">
                <div className="text-4xl font-bold text-emerald-600 mb-1">{kpis.terminees}</div>
                <div className="text-lg font-semibold text-slate-700 mb-1">Terminées</div>
                <div className="text-sm text-slate-500">Missions complétées</div>
              </div>
            </div>
          </button>
        </section>

        {/* Filtres + Réglages de publication */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 text-lg">🔍</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Filtres et recherche</h2>
          </div>

          {/* Ligne filtres de recherche */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="bg-white border border-slate-300 rounded-2xl px-4 py-4 md:col-span-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              placeholder="Recherche (titre, description, ville)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
            <input
              className="bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              placeholder="Ville"
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
            />
            <input
              type="datetime-local"
              className="bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <input
              type="datetime-local"
              className="bg-white border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>

          {/* Réglages de diffusion (globaux) */}
          <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-200">
            <label className="text-sm font-semibold text-slate-700">TTL (validité offre) :</label>
            <select
              className="bg-white border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(Number(e.target.value))}
            >
              {[15, 30, 60].map((n) => (
                <option key={n} value={n}>{n} min</option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                checked={includeEmployees}
                onChange={(e) => setIncludeEmployees(e.target.checked)}
              />
              Inclure salariés
            </label>

            <span className="text-xs text-slate-500">
              Ces réglages s'appliquent à tous les boutons <b>Publier / Re-publier</b> ci-dessous.
            </span>
          </div>
        </section>

        {/* Tableau */}
        <section className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700">
                <tr>
                  <Th onClick={() => toggleSort("created_at")} active={sortBy === "created_at"} dir={sortDir}>Créée</Th>
                  <Th onClick={() => toggleSort("title")} active={sortBy === "title"} dir={sortDir}>Titre</Th>
                  <Th onClick={() => toggleSort("type")} active={sortBy === "type"} dir={sortDir}>Type</Th>
                  <Th onClick={() => toggleSort("status")} active={sortBy === "status"} dir={sortDir}>Statut</Th>
                  <Th onClick={() => toggleSort("city")} active={sortBy === "city"} dir={sortDir}>Ville</Th>
                  <Th onClick={() => toggleSort("scheduled_start")} active={sortBy === "scheduled_start"} dir={sortDir}>
                    Créneau
                  </Th>
                  <Th onClick={() => toggleSort("estimated_duration_min")} active={sortBy === "estimated_duration_min"} dir={sortDir}>
                    Durée
                  </Th>
                  <Th onClick={() => toggleSort("price_subcontractor_cents")} active={sortBy === "price_subcontractor_cents"} dir={sortDir}>
                    Part ST
                  </Th>
                  <Th onClick={() => toggleSort("price_total_cents")} active={sortBy === "price_total_cents"} dir={sortDir}>
                    Total
                  </Th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((m) => {
                  const accepted = m.assigned_user_id !== null;
                  const canEdit = !accepted;
                  const canDelete = !accepted;
                  const isPublishing = publishingId === m.id;
                  const isDeleting = deletingId === m.id;

                  const st = normalizeStatus(m.status);
                  const publishLabel = st === "Publiée"
                    ? (isPublishing ? "Re-publication…" : "Re-publier")
                    : (isPublishing ? "Publication…" : "Publier");

                  return (
                    <tr key={m.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all">
                      <td className="p-6 whitespace-nowrap text-slate-600 font-medium">{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</td>
                      <td className="p-6 font-semibold text-slate-900">{m.title ?? "—"}</td>
                      <td className="p-6 whitespace-nowrap text-slate-600 font-medium">{m.type ?? "—"}</td>
                      <td className="p-6 whitespace-nowrap"><StatusBadge status={st} /></td>
                      <td className="p-6 whitespace-nowrap text-slate-600 font-medium">{m.city ?? "—"}</td>
                      <td className="p-6 whitespace-nowrap text-slate-600 font-medium">
                        {m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : "—"}
                      </td>
                      <td className="p-6 text-right text-slate-600 font-medium">{m.estimated_duration_min ?? "—"}</td>
                      <td className="p-6 text-right font-bold text-emerald-600">{cents(m.price_subcontractor_cents, m.currency)}</td>
                      <td className="p-6 text-right font-bold text-slate-900">{cents(m.price_total_cents, m.currency)}</td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          {canEdit || canDelete ? (
                            <ActionDropdown
                              mission={m}
                              canEdit={canEdit}
                              canDelete={canDelete}
                              isPublishing={isPublishing}
                              isDeleting={isDeleting}
                              publishLabel={publishLabel}
                              ttlMinutes={ttlMinutes}
                              includeEmployees={includeEmployees}
                              onEdit={() => setEditing(m)}
                              onPublish={() => onPublish(m)}
                              onDelete={() => onDelete(m)}
                            />
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Verrouillée</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="p-12 text-slate-500 text-center" colSpan={10}>
                      <div className="text-6xl mb-4">📭</div>
                      <div className="text-lg font-medium">Aucune mission pour ces filtres</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-8 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="text-sm text-slate-700 font-semibold">
              {total} résultat(s) • Page {page} / {pageCount}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="px-6 py-3 bg-white border-2 border-slate-300 rounded-2xl disabled:opacity-50 hover:bg-slate-50 transition-all transform hover:scale-105 shadow-lg font-medium"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ◀
              </button>
              <button
                className="px-6 py-3 bg-white border-2 border-slate-300 rounded-2xl disabled:opacity-50 hover:bg-slate-50 transition-all transform hover:scale-105 shadow-lg font-medium"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
              >
                ▶
              </button>
              <select
                className="bg-white border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/page</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Modal édition */}
        {editing && (
          <MissionEditModal
            open={!!editing}
            mission={editing}
            onClose={() => setEditing(null)}
            onSaved={(updated) => {
              setRows((prev) => prev.map((x) => (x.id === updated.id ? (updated as Mission) : x)));
              setEditing(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------- Sub components ----------------

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="p-4 text-left select-none">
      <button 
        onClick={onClick} 
        className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
      >
        {children}
        {active && <span className="text-sm text-blue-600">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: MissionStatus }) {
  const s = status; // déjà normalisé

  let cls = "bg-slate-100 text-slate-800 border border-slate-200";
  if (s === "Publiée")
    cls = "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300";
  else if (s === "Assignée")
    cls = "bg-gradient-to-r from-violet-100 to-violet-200 text-violet-800 border border-violet-300";
  else if (s === "En cours")
    cls = "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300";
  else if (s === "Terminé")
    cls = "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300";

  const displayStatus =
    s === "Terminé" ? "Terminée" :
    s;

  return <span className={`text-xs px-4 py-2 rounded-full whitespace-nowrap font-semibold shadow-sm ${cls}`}>{displayStatus}</span>;
}

// Composant dropdown pour les actions
function ActionDropdown({
  mission,
  canEdit,
  canDelete,
  isPublishing,
  isDeleting,
  publishLabel,
  ttlMinutes,
  includeEmployees,
  onEdit,
  onPublish,
  onDelete,
}: {
  mission: Mission;
  canEdit: boolean;
  canDelete: boolean;
  isPublishing: boolean;
  isDeleting: boolean;
  publishLabel: string;
  ttlMinutes: number;
  includeEmployees: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="px-3 py-1.5 border rounded hover:bg-gray-50 flex items-center gap-1"
        onClick={handleToggle}
        disabled={isPublishing || isDeleting}
      >
        Actions
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer le dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu dropdown */}
          <div 
            className="fixed bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-2xl shadow-2xl min-w-[200px] z-50 overflow-hidden"
            style={{
              top: buttonRect ? buttonRect.bottom + 4 : 0,
              left: buttonRect ? buttonRect.right - 180 : 0,
            }}
          >
            {canEdit && (
              <>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 font-medium text-slate-700 hover:text-blue-600 transition-all"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                >
                  ✏️ Modifier
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-700 hover:text-green-600 transition-all"
                  disabled={isPublishing}
                  onClick={() => {
                    onPublish();
                    setIsOpen(false);
                  }}
                  title={`Diffuser l'offre (${ttlMinutes}min${includeEmployees ? ", salariés inclus" : ""})`}
                >
                  📢 {publishLabel}
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 font-medium text-slate-700 hover:text-purple-600 transition-all"
                  onClick={() => {
                    window.open(`/admin/map?mission=${mission.id}`, '_blank');
                    setIsOpen(false);
                  }}
                  title="Voir cette mission sur la carte"
                >
                  🗺️ Voir sur la carte
                </button>
              </>
            )}
            
            {canDelete && (
              <>
                {canEdit && <div className="border-t border-slate-200 my-1" />}
                <button
                  className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                  disabled={isDeleting}
                  onClick={() => {
                    onDelete();
                    setIsOpen(false);
                  }}
                  title="Supprimer la mission"
                >
                  🗑️ {isDeleting ? "Suppression..." : "Supprimer"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
