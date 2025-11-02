import { AlertCircle, Clock } from 'lucide-react';

interface PauseBannerProps {
  pauseReason: string;
  pauseNote?: string;
  updatedAt: string;
}

const PAUSE_REASON_LABELS: Record<string, string> = {
  'client_absent': 'Client absent',
  'acces_impossible': 'Accès impossible',
  'pieces_manquantes': 'Pièces manquantes',
  'securite': 'Problème de sécurité',
  'contre_ordre': 'Contre-ordre',
};

export function PauseBanner({ pauseReason, pauseNote, updatedAt }: PauseBannerProps) {
  const label = PAUSE_REASON_LABELS[pauseReason] || pauseReason;

  // Calculer durée pause
  const pausedSince = new Date(updatedAt);
  const now = new Date();
  const hourspaused = Math.floor((now.getTime() - pausedSince.getTime()) / (1000 * 60 * 60));

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Mission en pause
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="font-semibold">{label}</p>
            {pauseNote && <p className="mt-1 text-gray-600">{pauseNote}</p>}
          </div>
          <div className="mt-2 flex items-center text-xs text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            En pause depuis {hourspaused}h
          </div>
        </div>
      </div>
    </div>
  );
}
