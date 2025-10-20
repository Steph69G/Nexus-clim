import { supabase } from "@/lib/supabase";
import type { KpiSnapshot } from "@/types/database";

export async function fetchLatestKpis(
  periodType: KpiSnapshot["period_type"] = "monthly",
  limit = 12
): Promise<KpiSnapshot[]> {
  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .eq("period_type", periodType)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as KpiSnapshot[];
}

export async function fetchCurrentMonthKpis(): Promise<KpiSnapshot | null> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .eq("period_type", "monthly")
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error) throw error;
  return data as KpiSnapshot | null;
}

export async function calculateCurrentMonthKpis(): Promise<string> {
  const { data, error } = await supabase.rpc("calculate_current_month_kpis");

  if (error) throw error;
  return data as string;
}

export async function fetchKpisByDateRange(
  startDate: string,
  endDate: string
): Promise<KpiSnapshot[]> {
  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .gte("period_start", startDate)
    .lte("period_end", endDate)
    .order("period_start", { ascending: true });

  if (error) throw error;
  return (data || []) as KpiSnapshot[];
}

export type DashboardSummary = {
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  satisfaction: {
    rating: number;
    nps: number;
    responseRate: number;
  };
  operations: {
    missionsCompleted: number;
    onTimeRate: number;
    averageDelay: number;
  };
  conversion: {
    rate: number;
    quotesAccepted: number;
    quotesTotal: number;
  };
};

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  const currentMonth = await fetchCurrentMonthKpis();
  if (!currentMonth) return null;

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];

  const { data: previousMonth } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .eq("period_type", "monthly")
    .eq("period_start", lastMonth)
    .maybeSingle();

  const prevRevenue = previousMonth?.total_revenue_ttc || 0;
  const currentRevenue = currentMonth.total_revenue_ttc;

  return {
    revenue: {
      current: currentRevenue,
      previous: prevRevenue,
      change:
        prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    },
    satisfaction: {
      rating: currentMonth.average_client_rating || 0,
      nps: currentMonth.nps_score || 0,
      responseRate: currentMonth.survey_response_rate || 0,
    },
    operations: {
      missionsCompleted: currentMonth.missions_completed,
      onTimeRate: currentMonth.on_time_completion_rate || 0,
      averageDelay: currentMonth.average_intervention_delay_hours || 0,
    },
    conversion: {
      rate: currentMonth.conversion_rate || 0,
      quotesAccepted: currentMonth.quotes_signed,
      quotesTotal: currentMonth.quotes_sent,
    },
  };
}
