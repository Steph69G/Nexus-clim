import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  to?: string;
  forceShow?: boolean;
  fallbackPath?: string;
  className?: string;
  label?: string;
};

const ROOT_PATHS = new Set<string>(["/", "/admin", "/dashboard", "/tech", "/client", "/manager"]);

export function BackButton({
  to,
  forceShow = false,
  fallbackPath = "/admin",
  className = "",
  label = "Retour",
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = ROOT_PATHS.has(location.pathname);

  const handleClick = useCallback(() => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, to, fallbackPath]);

  if (!forceShow && isRoot) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Revenir à la page précédente"
      className={
        "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors " +
        className
      }
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
