import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";

export default function PublicNavbar() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 group-hover:bg-slate-200 transition-all">
            <Building2 className="w-5 h-5 text-slate-700" />
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors">
            Nexus <span className="text-slate-600">Clim</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm"
          >
            Se connecter
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}