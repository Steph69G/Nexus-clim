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
};

export default function OperationalCard({
  icon,
  title,
  description,
  to,
  hidden,
  disabled,
  onClick,
}: Props) {
  if (hidden) return null;

  const content = (
    <div
      className={cn(
        "group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200",
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100 transition-colors">
          {icon}
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
          {description ? (
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return <Link to={to} aria-disabled={disabled}>{content}</Link>;
}
