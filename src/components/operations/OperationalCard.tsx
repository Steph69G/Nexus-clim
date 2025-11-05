import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OperationalCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
  disabled?: boolean;
  hidden?: boolean;
  iconColor?: string;
  iconBgColor?: string;
}

export function OperationalCard({
  icon: Icon,
  title,
  description,
  route,
  disabled = false,
  hidden = false,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50',
}: OperationalCardProps) {
  const navigate = useNavigate();

  if (hidden) return null;

  const handleClick = () => {
    if (!disabled) {
      navigate(route);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        group relative w-full text-left
        bg-white rounded-2xl shadow-sm border border-slate-200
        p-6 transition-all duration-200
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }
      `}
      aria-label={`Accéder à ${title}`}
      aria-disabled={disabled}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center transition-transform ${
            disabled ? '' : 'group-hover:scale-110'
          }`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2">{description}</p>
        </div>
      </div>

      {disabled && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
            Bientôt
          </span>
        </div>
      )}
    </button>
  );
}
