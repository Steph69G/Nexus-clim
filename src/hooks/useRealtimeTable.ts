import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UseRealtimeTableOptions<T> {
  table: string;
  select?: string;
  filter?: string;
  orderBy?: { column: string; ascending?: boolean };
  transform?: (data: any) => T;
}

export function useRealtimeTable<T = any>({
  table,
  select = "*",
  filter,
  orderBy,
  transform,
}: UseRealtimeTableOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).select(select);

      if (filter) {
        const [column, operator, value] = filter.split(".");
        if (operator === "eq") {
          query = query.eq(column, value);
        } else if (operator === "neq") {
          query = query.neq(column, value);
        } else if (operator === "in") {
          query = query.in(column, value.split(","));
        }
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      const transformed = transform && result ? result.map(transform) : result;
      setData((transformed as T[]) || []);
    } catch (e: any) {
      console.error(`[useRealtimeTable] Error loading ${table}:`, e);
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [table, select, filter, orderBy, transform]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let channel: RealtimeChannel;

    const subscribeToChanges = () => {
      const channelConfig: any = {
        event: "*",
        schema: "public",
        table: table,
      };

      if (filter) {
        const [column, operator, value] = filter.split(".");
        if (operator === "eq") {
          channelConfig.filter = `${column}=eq.${value}`;
        }
      }

      channel = supabase
        .channel(`realtime-${table}-${Date.now()}`)
        .on("postgres_changes", channelConfig, (payload) => {
          console.log(`[useRealtimeTable] ${payload.eventType} on ${table}:`, payload);

          if (payload.eventType === "INSERT") {
            const newItem = transform ? transform(payload.new) : payload.new;
            setData((prev) => {
              const exists = prev.some((item: any) => item.id === payload.new.id);
              if (exists) return prev;
              return [newItem as T, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedItem = transform ? transform(payload.new) : payload.new;
            setData((prev) =>
              prev.map((item: any) =>
                item.id === payload.new.id ? updatedItem : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setData((prev) =>
              prev.filter((item: any) => item.id !== payload.old.id)
            );
          }
        })
        .subscribe((status) => {
          console.log(`[useRealtimeTable] Subscription status for ${table}:`, status);
        });
    };

    subscribeToChanges();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter, transform]);

  return {
    data,
    loading,
    error,
    refresh: loadData,
  };
}
