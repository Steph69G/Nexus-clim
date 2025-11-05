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
        "rounded-2xl border bg-card p-5 shadow-sm hover:-translate-y-0.5 transition",
        disabled && "opacity-60 pointer-events-none"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="text-primary">{icon}</div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return <Link to={to} aria-disabled={disabled}>{content}</Link>;
}
