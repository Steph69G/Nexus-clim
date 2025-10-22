import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-slate-50 grid place-items-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-slate-900">403</h1>
          <h2 className="text-2xl font-semibold text-slate-700">Accès refusé</h2>
          <p className="text-slate-600">
            Vous n'avez pas les droits nécessaires pour consulter cette page.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
