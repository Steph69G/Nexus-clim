import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

export type DomainLink = {
  to: string;
  icon?: LucideIcon;
  label: string;
  description?: string;
  badge?: string;
  color?: string;
};

type DomainHubProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  links: DomainLink[];
};

export function DomainHub({ title, description, icon, links }: DomainHubProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                {icon}
              </div>
            )}
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          </div>
          {description && (
            <p className="text-slate-600 ml-15">
              {description}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {links.map((link) => (
            <DomainCard key={link.to} {...link} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DomainCard({
  to,
  icon: Icon,
  label,
  description,
  badge,
  color = "blue"
}: DomainLink) {
  const colorClasses: Record<string, string> = {
    blue: 'hover:border-blue-400 hover:shadow-blue-100',
    green: 'hover:border-green-400 hover:shadow-green-100',
    emerald: 'hover:border-emerald-400 hover:shadow-emerald-100',
    orange: 'hover:border-orange-400 hover:shadow-orange-100',
    purple: 'hover:border-purple-400 hover:shadow-purple-100',
    cyan: 'hover:border-cyan-400 hover:shadow-cyan-100',
    red: 'hover:border-red-400 hover:shadow-red-100',
    indigo: 'hover:border-indigo-400 hover:shadow-indigo-100',
    yellow: 'hover:border-yellow-400 hover:shadow-yellow-100',
  };

  return (
    <Link
      to={to}
      className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-lg transition-all ${colorClasses[color]} group relative`}
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      {Icon && (
        <div className="mb-4 transform group-hover:scale-110 transition-transform">
          <Icon className={`w-10 h-10 text-${color}-600`} />
        </div>
      )}
      <h3 className={`text-xl font-bold text-slate-900 mb-2 group-hover:text-${color}-700 transition-colors`}>
        {label}
      </h3>
      {description && (
        <p className="text-slate-600 text-sm">
          {description}
        </p>
      )}
    </Link>
  );
}
