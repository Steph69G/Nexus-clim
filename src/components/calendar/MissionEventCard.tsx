import { MapPin, User, Clock } from "lucide-react";
import type { CalendarMission } from "@/api/missions.calendar";
import { getStatusColor, getStatusLabel } from "@/api/missions.calendar";

interface MissionEventCardProps {
  mission: CalendarMission;
  onClick: () => void;
}

export function MissionEventCard({ mission, onClick }: MissionEventCardProps) {
  const statusColor = getStatusColor(mission.status);
  const statusLabel = getStatusLabel(mission.status);

  const time = mission.scheduled_start
    ? new Date(mission.scheduled_start).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : mission.scheduled_window_start
    ? new Date(mission.scheduled_window_start).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded-lg border-l-4 ${statusColor.replace('bg-', 'border-')} bg-white hover:bg-slate-50 transition-colors shadow-sm hover:shadow-md mb-1`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {time && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
          )}

          <div className="font-medium text-sm text-slate-900 truncate">
            {mission.title}
          </div>

          {mission.client_name && (
            <div className="text-xs text-slate-600 truncate mt-0.5">
              {mission.client_name}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {mission.assigned_user_name && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{mission.assigned_user_name}</span>
              </div>
            )}

            {mission.city && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{mission.city}</span>
              </div>
            )}
          </div>
        </div>

        <div className={`shrink-0 w-2 h-2 rounded-full ${statusColor} mt-1`} />
      </div>

      {mission.intervention_type_name && (
        <div className="mt-1.5 text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded inline-block">
          {mission.intervention_type_name}
        </div>
      )}
    </button>
  );
}
