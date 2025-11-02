import { AlertCircle, Play, Pause, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { supabase } from '../../supabase';

interface MissionHeaderActionsProps {
  missionId: string;
  status: string;
  reportStatus?: string;
  billingStatus?: string;
  userRole: string;
  assignedUserId?: string;
  currentUserId?: string;
  onSuccess?: () => void;
}

export function MissionHeaderActions({
  missionId,
  status,
  reportStatus,
  billingStatus,
  userRole,
  assignedUserId,
  currentUserId,
  onSuccess
}: MissionHeaderActionsProps) {

  const isAssigned = assignedUserId === currentUserId;
  const isAdmin = ['admin', 'manager', 'sal'].includes(userRole);
  const isTech = ['tech', 'st'].includes(userRole);

  const handleTransition = async (rpcName: string, params: Record<string, any> = {}) => {
    try {
      const { error } = await supabase.rpc(rpcName, { mission_id: missionId, ...params });

      if (error) {
        // Mapper code erreur
        const errorCode = error.message.match(/E_\w+/)?.[0];
        console.error(`[${rpcName}] Error:`, errorCode || error.message);
        alert(`Erreur : ${errorCode || error.message}`);
        return;
      }

      alert('Transition réussie');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert('Erreur réseau');
    }
  };

  // Boutons contextuels par statut
  const renderActions = () => {
    // BROUILLON → PUBLIEE (admin)
    if (status === 'BROUILLON' && isAdmin) {
      return (
        <button
          onClick={() => handleTransition('rpc_publish_mission')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Publier
        </button>
      );
    }

    // PUBLIEE → ACCEPTEE (tech)
    if (status === 'PUBLIEE' && isTech && !assignedUserId) {
      return (
        <button
          onClick={() => handleTransition('rpc_accept_mission')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Accepter
        </button>
      );
    }

    // ACCEPTEE → PLANIFIEE (admin/tech)
    if (status === 'ACCEPTEE' && (isAdmin || isAssigned)) {
      return (
        <button
          onClick={() => {
            const start = prompt('Date/heure début (YYYY-MM-DD HH:MM)');
            if (start) {
              handleTransition('rpc_schedule_mission', { scheduled_start: new Date(start).toISOString() });
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Planifier
        </button>
      );
    }

    // PLANIFIEE → EN_ROUTE (tech)
    if (status === 'PLANIFIEE' && isTech && isAssigned) {
      return (
        <button
          onClick={() => handleTransition('rpc_start_travel')}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Démarrer trajet
        </button>
      );
    }

    // EN_ROUTE → EN_INTERVENTION (tech)
    if (status === 'EN_ROUTE' && isTech && isAssigned) {
      return (
        <button
          onClick={() => handleTransition('rpc_start_intervention')}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Démarrer intervention
        </button>
      );
    }

    // EN_INTERVENTION → EN_PAUSE (tech)
    if (status === 'EN_INTERVENTION' && isTech && isAssigned) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const reason = prompt('Motif pause (client_absent, acces_impossible, pieces_manquantes, securite, contre_ordre)');
              const note = prompt('Note (optionnel)');
              if (reason) {
                handleTransition('rpc_pause_mission', { pause_reason: reason, pause_note: note || '' });
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Mettre en pause
          </button>
          <button
            onClick={() => handleTransition('rpc_complete_intervention')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Terminer
          </button>
        </div>
      );
    }

    // EN_PAUSE → EN_INTERVENTION (tech)
    if (status === 'EN_PAUSE' && isTech && isAssigned) {
      return (
        <button
          onClick={() => handleTransition('rpc_resume_from_pause')}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Reprendre
        </button>
      );
    }

    // A_VALIDER → VALIDE (admin)
    if (reportStatus === 'A_VALIDER' && isAdmin) {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleTransition('rpc_validate_report')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Valider rapport
          </button>
          <button
            onClick={() => {
              const reason = prompt('Motif rejet (photos_insuffisantes, mesures_manquantes, signature_manquante, incoherence_rapport)');
              const details = prompt('Détails');
              if (reason) {
                handleTransition('rpc_reject_report', { rejection_reason: reason, details });
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Rejeter
          </button>
        </div>
      );
    }

    // FACTURABLE → FACTUREE (admin)
    if (billingStatus === 'FACTURABLE' && isAdmin) {
      return (
        <button
          onClick={() => {
            const number = prompt('Numéro facture');
            // TODO: ouvrir modal complexe pour lignes/montants
            if (number) {
              alert('TODO: Modal facturation complète');
            }
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Émettre facture
        </button>
      );
    }

    // FACTUREE → PAYEE (admin)
    if (billingStatus === 'FACTUREE' && isAdmin) {
      return (
        <button
          onClick={() => handleTransition('rpc_mark_invoice_paid')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Marquer payée
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-3">
      {renderActions()}
    </div>
  );
}
