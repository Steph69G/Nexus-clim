import { useState } from 'react';
import { moveMission, type MoveMissionArgs } from '@/api/missions.calendar';

export type CalendarView = "week" | "month" | "day" | "resource";

export type DragDropEvent = {
  id: string;
  start: Date;
  end: Date;
  assigneeId?: string;
};

export function useMissionDragDrop(view: CalendarView) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const onDropEvent = async (payload: DragDropEvent) => {
    setIsPending(true);
    setError(null);

    try {
      const args: MoveMissionArgs = {
        missionId: payload.id,
        start: payload.start.toISOString(),
        end: payload.end.toISOString(),
        assigneeId: payload.assigneeId,
        source: view,
      };

      await moveMission(args);

      window.dispatchEvent(new CustomEvent('mission-moved', {
        detail: {
          missionId: payload.id,
          start: payload.start,
          end: payload.end,
          view
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to move mission'));

      window.dispatchEvent(new CustomEvent('mission-move-error', {
        detail: {
          error: err instanceof Error ? err.message : 'Unknown error',
          missionId: payload.id
        }
      }));

      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    onDropEvent,
    isPending,
    error,
  };
}
