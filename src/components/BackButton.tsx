import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'button';
}

export default function BackButton({
  to,
  label = 'Retour',
  className = '',
  variant = 'default'
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const variantStyles = {
    default: 'flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors',
    minimal: 'text-slate-600 hover:text-slate-900 transition-colors',
    button: 'flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900'
  };

  return (
    <button
      onClick={handleClick}
      className={`${variantStyles[variant]} ${className}`}
      aria-label={label}
    >
      {variant !== 'minimal' && <ArrowLeft className="w-5 h-5" />}
      {variant === 'minimal' ? '← ' : ''}{label}
    </button>
  );
}
