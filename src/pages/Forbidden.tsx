export default function Forbidden() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600">403</h1>
        <p className="text-gray-700">Accès refusé</p>
        <p className="text-sm opacity-70">
          Vous n’avez pas les droits nécessaires pour consulter cette page.
        </p>
      </div>
    </div>
  );
}
