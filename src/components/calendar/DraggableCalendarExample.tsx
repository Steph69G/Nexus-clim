import { useMissionDragDrop } from './useMissionDragDrop';
import { CalendarView } from './CalendarView';
import type { CalendarMission } from '@/api/missions.calendar';

interface DraggableCalendarExampleProps {
  missions: CalendarMission[];
  onMissionClick: (mission: CalendarMission) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function DraggableCalendarExample({
  missions,
  onMissionClick,
  currentMonth,
  onMonthChange,
  selectedStatuses,
  onStatusToggle,
}: DraggableCalendarExampleProps) {
  const { onDropEvent, isPending } = useMissionDragDrop('month');

  const handleMissionDrop = async (mission: CalendarMission, newDate: Date) => {
    const start = new Date(newDate);
    start.setHours(8, 0, 0, 0);

    const end = new Date(start);
    end.setHours(9, 0, 0, 0);

    try {
      await onDropEvent({
        id: mission.id.toString(),
        start,
        end,
        assigneeId: mission.assigned_user_id,
      });

      window.location.reload();
    } catch (error) {
      console.error('Failed to move mission:', error);
      alert(error instanceof Error ? error.message : 'Failed to move mission');
    }
  };

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Déplacement en cours...</p>
          </div>
        </div>
      )}

      <CalendarView
        missions={missions}
        onMissionClick={onMissionClick}
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
        selectedStatuses={selectedStatuses}
        onStatusToggle={onStatusToggle}
      />
    </div>
  );
}
