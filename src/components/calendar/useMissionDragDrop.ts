import { useState } from 'react';
import { moveMission, type MoveMissionArgs } from '@/api/missions.calendar';

export type CalendarView = "week" | "month" | "day" | "resource";

export type DragDropEvent = {
  id: string;
  start: Date;
  end: Date;
  assigneeId?: string;
  force?: boolean;
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
        force: !!payload.force,
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
      const error = err instanceof Error ? err : new Error('Failed to move mission');
      setError(error);

      const errorMsg = String(error.message || err);
      let friendlyMessage = 'Déplacement impossible.';

      if (errorMsg.includes('Conflict') || errorMsg.includes('conflict')) {
        friendlyMessage = 'Conflit de planning avec une autre mission.';
      } else if (errorMsg.includes('Not allowed') || errorMsg.includes('not allowed')) {
        friendlyMessage = "Vous n'avez pas les droits pour déplacer cette mission.";
      } else if (errorMsg.includes('Weekend') || errorMsg.includes('weekend')) {
        friendlyMessage = 'Week-end interdit (maintenez Alt pour forcer si besoin).';
      } else if (errorMsg.includes('Outside business hours') || errorMsg.includes('business hours')) {
        friendlyMessage = 'Hors horaires ouvrés (Alt pour forcer).';
      } else if (errorMsg.includes('status')) {
        friendlyMessage = 'Cette mission ne peut pas être déplacée (statut bloqué).';
      }

      window.dispatchEvent(new CustomEvent('mission-move-error', {
        detail: {
          error: errorMsg,
          friendlyMessage,
          missionId: payload.id
        }
      }));

      throw error;
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
