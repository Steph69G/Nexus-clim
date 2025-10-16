import { supabase } from "@/lib/supabase";
import type { MissionStatus } from "@/types/mission";

export interface CalendarMission {
  id: number;
  title: string;
  status: MissionStatus;
  scheduled_start: string | null;
  scheduled_window_start: string | null;
  scheduled_window_end: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  intervention_type_id: string | null;
  intervention_type_name: string | null;
  client_name: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
}

export interface CalendarFilters {
  startDate: string;
  endDate: string;
  statuses?: MissionStatus[];
  assignedUserId?: string | null;
  interventionTypeId?: string | null;
  showOnlyMine?: boolean;
}

export async function fetchCalendarMissions(
  filters: CalendarFilters
): Promise<CalendarMission[]> {
  let query = supabase
    .from("missions")
    .select(`
      id,
      title,
      status,
      scheduled_start,
      scheduled_window_start,
      scheduled_window_end,
      assigned_user_id,
      intervention_type_id,
      client_name,
      address,
      city,
      created_at,
      profiles!missions_assigned_user_id_fkey(full_name),
      intervention_types(label)
    `);

  if (filters.startDate && filters.endDate) {
    query = query.or(
      `scheduled_start.gte.${filters.startDate},scheduled_start.lte.${filters.endDate},` +
      `scheduled_window_start.gte.${filters.startDate},scheduled_window_start.lte.${filters.endDate},` +
      `created_at.gte.${filters.startDate},created_at.lte.${filters.endDate}`
    );
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  if (filters.assignedUserId) {
    query = query.eq("assigned_user_id", filters.assignedUserId);
  } else if (filters.showOnlyMine) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq("assigned_user_id", user.id);
    }
  }

  if (filters.interventionTypeId) {
    query = query.eq("intervention_type_id", filters.interventionTypeId);
  }

  const { data, error } = await query.order("scheduled_start", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    scheduled_start: m.scheduled_start,
    scheduled_window_start: m.scheduled_window_start,
    scheduled_window_end: m.scheduled_window_end,
    assigned_user_id: m.assigned_user_id,
    assigned_user_name: m.profiles?.full_name || null,
    intervention_type_id: m.intervention_type_id,
    intervention_type_name: m.intervention_types?.label || null,
    client_name: m.client_name,
    address: m.address,
    city: m.city,
    created_at: m.created_at,
  }));
}

export async function updateMissionSchedule(
  missionId: number,
  scheduledStart: string | null
): Promise<void> {
  const { error } = await supabase
    .from("missions")
    .update({ scheduled_start: scheduledStart })
    .eq("id", missionId);

  if (error) throw new Error(error.message);
}

export function getMissionDateForCalendar(mission: CalendarMission): Date | null {
  if (mission.scheduled_start) {
    return new Date(mission.scheduled_start);
  }
  if (mission.scheduled_window_start) {
    return new Date(mission.scheduled_window_start);
  }
  return new Date(mission.created_at);
}

export function getStatusColor(status: MissionStatus): string {
  switch (status) {
    case "PLANIFIEE":
      return "bg-green-500";
    case "EN_ROUTE":
    case "EN_INTERVENTION":
      return "bg-blue-500";
    case "TERMINEE":
    case "CLOTUREE":
      return "bg-gray-400";
    case "FACTURABLE":
    case "FACTUREE":
    case "PAYEE":
      return "bg-orange-500";
    case "ANNULEE":
      return "bg-red-500";
    case "ACCEPTEE":
      return "bg-teal-500";
    case "PUBLIEE":
      return "bg-indigo-500";
    default:
      return "bg-slate-400";
  }
}

export function getStatusLabel(status: MissionStatus): string {
  return status.replace(/_/g, " ");
}
