import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  to: string;
  hidden?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'cyan' | 'yellow';
};

const colorStyles = {
  blue: { bg: 'bg-blue-50', hoverBg: 'group-hover:bg-blue-100', icon: 'text-blue-600', hoverText: 'group-hover:text-blue-600', border: 'hover:border-blue-200' },
  green: { bg: 'bg-green-50', hoverBg: 'group-hover:bg-green-100', icon: 'text-green-600', hoverText: 'group-hover:text-green-600', border: 'hover:border-green-200' },
  orange: { bg: 'bg-orange-50', hoverBg: 'group-hover:bg-orange-100', icon: 'text-orange-600', hoverText: 'group-hover:text-orange-600', border: 'hover:border-orange-200' },
  purple: { bg: 'bg-purple-50', hoverBg: 'group-hover:bg-purple-100', icon: 'text-purple-600', hoverText: 'group-hover:text-purple-600', border: 'hover:border-purple-200' },
  red: { bg: 'bg-red-50', hoverBg: 'group-hover:bg-red-100', icon: 'text-red-600', hoverText: 'group-hover:text-red-600', border: 'hover:border-red-200' },
  cyan: { bg: 'bg-cyan-50', hoverBg: 'group-hover:bg-cyan-100', icon: 'text-cyan-600', hoverText: 'group-hover:text-cyan-600', border: 'hover:border-cyan-200' },
  yellow: { bg: 'bg-yellow-50', hoverBg: 'group-hover:bg-yellow-100', icon: 'text-yellow-600', hoverText: 'group-hover:text-yellow-600', border: 'hover:border-yellow-200' },
};

export default function OperationalCard({
  icon,
  title,
  description,
  to,
  hidden,
  disabled,
  onClick,
  color = 'blue',
}: Props) {
  if (hidden) return null;

  const colors = colorStyles[color];

  const content = (
    <div
      className={cn(
        "group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200",
        colors.border,
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg p-2.5 transition-colors", colors.bg, colors.hoverBg, colors.icon)}>
          {icon}
        </div>
        <div className="space-y-1 flex-1">
          <h3 className={cn("text-base font-semibold text-gray-900 transition-colors", colors.hoverText)}>{title}</h3>
          {description ? (
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return <Link to={to} aria-disabled={disabled}>{content}</Link>;
}
