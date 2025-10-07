import { X, Calendar, Phone, MapPin, CheckCircle } from "lucide-react";

interface MissionAcceptedModalProps {
  mission: {
    title: string;
    scheduled_start: string | null;
    client_name: string | null;
    client_phone: string | null;
    address: string;
    city: string;
  };
  userRole: "st" | "sal" | "tech";
  onClose: () => void;
  onConfirmAppointment?: () => void;
  onProposeNewDate?: () => void;
  onCallClient?: () => void;
}

export default function MissionAcceptedModal({
  mission,
  userRole,
  onClose,
  onConfirmAppointment,
  onProposeNewDate,
  onCallClient,
}: MissionAcceptedModalProps) {
  const hasScheduledDate = !!mission.scheduled_start;
  const isST = userRole === "st";
  const isSAL = userRole === "sal" || userRole === "tech";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "À convenir";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">
                {isST ? "Mission prise en charge !" : "Mission acceptée !"}
              </h2>
              <p className="text-emerald-100 text-lg">
                {isST ? "Vous êtes maintenant responsable de cette mission" : "Vous avez bien accepté cette mission"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">{mission.title}</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="text-blue-600 mt-1" size={20} />
                <div>
                  <div className="text-sm font-medium text-slate-700">Rendez-vous</div>
                  <div className="text-slate-900 font-semibold">
                    {hasScheduledDate ? formatDate(mission.scheduled_start) : "À convenir avec le client"}
                  </div>
                </div>
              </div>

              {mission.client_name && (
                <div className="flex items-start gap-3">
                  <Phone className="text-emerald-600 mt-1" size={20} />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Contact client</div>
                    <div className="text-slate-900">
                      {mission.client_name}
                      {mission.client_phone && (
                        <a
                          href={`tel:${mission.client_phone}`}
                          className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          {mission.client_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="text-orange-600 mt-1" size={20} />
                <div>
                  <div className="text-sm font-medium text-slate-700">Adresse</div>
                  <div className="text-slate-900">{mission.address}</div>
                  <div className="text-slate-600 text-sm">{mission.city}</div>
                </div>
              </div>
            </div>
          </div>

          {isSAL && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <p className="text-slate-700 text-center mb-4">
                Le rendez-vous est fixé. Vous recevrez plus d'informations avant l'intervention.
              </p>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                J'ai compris, voir mes missions
              </button>
            </div>
          )}

          {isST && (
            <div className="space-y-3">
              <p className="text-slate-700 text-center font-medium mb-4">
                Que souhaitez-vous faire ?
              </p>

              {hasScheduledDate && onConfirmAppointment && (
                <button
                  onClick={onConfirmAppointment}
                  className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Valider ce créneau
                </button>
              )}

              {onProposeNewDate && (
                <button
                  onClick={onProposeNewDate}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  {hasScheduledDate ? "Proposer une autre date" : "Fixer un rendez-vous"}
                </button>
              )}

              {onCallClient && mission.client_phone && (
                <button
                  onClick={onCallClient}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <Phone size={20} />
                  Appeler le client maintenant
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Voir la fiche mission complète
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
