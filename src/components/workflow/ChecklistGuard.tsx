import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ChecklistItem {
  label: string;
  completed: boolean;
  required: boolean;
}

interface ChecklistGuardProps {
  items: ChecklistItem[];
  onComplete?: () => void;
  canComplete: boolean;
}

export function ChecklistGuard({ items, onComplete, canComplete }: ChecklistGuardProps) {
  const requiredItems = items.filter(item => item.required);
  const completedRequired = requiredItems.filter(item => item.completed).length;
  const totalRequired = requiredItems.length;
  const allRequiredComplete = completedRequired === totalRequired;

  const progress = totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Checklist intervention
        </h3>
        <span className="text-sm text-gray-500">
          {completedRequired}/{totalRequired} requis
        </span>
      </div>

      {/* Barre progression */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              allRequiredComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items checklist */}
      <div className="space-y-2 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.completed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className={`w-5 h-5 ${item.required ? 'text-red-500' : 'text-gray-400'}`} />
            )}
            <span className={`text-sm ${item.completed ? 'text-gray-900' : 'text-gray-600'}`}>
              {item.label}
              {item.required && !item.completed && (
                <span className="ml-1 text-red-500 font-semibold">*</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Bouton terminer */}
      {!allRequiredComplete && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              Complétez tous les éléments requis (*) avant de terminer l'intervention.
            </p>
          </div>
        </div>
      )}

      {allRequiredComplete && canComplete && onComplete && (
        <button
          onClick={onComplete}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Terminer l'intervention
        </button>
      )}

      {allRequiredComplete && !canComplete && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded text-center text-sm text-gray-600">
          Mission prête à être terminée
        </div>
      )}
    </div>
  );
}
