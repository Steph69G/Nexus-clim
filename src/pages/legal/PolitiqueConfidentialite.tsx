import { Link } from "react-router-dom";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de confidentialité</h1>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p>
                Nexus Clim s'engage à protéger la confidentialité de vos données personnelles. Cette politique 
                de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos 
                informations personnelles lorsque vous utilisez notre plateforme.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-blue-800">
                  <strong>En résumé :</strong> Nous ne collectons que les données nécessaires au fonctionnement 
                  de notre service et nous nous engageons à les protéger selon les standards les plus élevés.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Données collectées</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">2.1 Données d'identification</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Adresse postale</li>
                <li>Informations de profil professionnel</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">2.2 Données de géolocalisation</h3>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-amber-800">
                  <strong>Important :</strong> Nous collectons votre position géographique uniquement avec votre 
                  consentement explicite pour optimiser l'attribution des missions selon votre zone d\'intervention.
                </p>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">2.3 Données techniques</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Adresse IP</li>
                <li>Type de navigateur et version</li>
                <li>Système d'exploitation</li>
                <li>Pages visitées et temps passé</li>
                <li>Données de connexion et d'utilisation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Utilisation des données</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Ce que nous faisons</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Gérer votre compte utilisateur</li>
                    <li>• Attribuer les missions selon votre profil</li>
                    <li>• Améliorer nos services</li>
                    <li>• Assurer la sécurité de la plateforme</li>
                    <li>• Vous contacter pour le support</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Ce que nous ne faisons jamais</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Vendre vos données à des tiers</li>
                    <li>• Utiliser vos données à des fins publicitaires</li>
                    <li>• Partager vos informations sans consentement</li>
                    <li>• Stocker des données inutiles</li>
                    <li>• Accéder à vos données sans raison légitime</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Partage des données</h2>
              <p>
                Vos données personnelles ne sont partagées qu'avec votre consentement explicite ou dans les cas suivants :
              </p>
              
              <div className="mt-4 space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">Partenaires techniques</h3>
                  <p className="text-gray-600">
                    Supabase (hébergement sécurisé), services de géolocalisation pour l'optimisation des missions.
                  </p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold">Obligations légales</h3>
                  <p className="text-gray-600">
                    En cas de demande des autorités compétentes dans le cadre d'une procédure judiciaire.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Sécurité des données</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🔒</div>
                  <h3 className="font-semibold mb-2">Chiffrement</h3>
                  <p className="text-sm text-gray-600">
                    Toutes les données sont chiffrées en transit et au repos
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🛡️</div>
                  <h3 className="font-semibold mb-2">Accès contrôlé</h3>
                  <p className="text-sm text-gray-600">
                    Accès limité aux seules personnes autorisées
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold mb-2">Surveillance</h3>
                  <p className="text-sm text-gray-600">
                    Monitoring 24/7 de la sécurité de nos systèmes
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Vos droits (RGPD)</h2>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-4">Vous disposez des droits suivants :</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Droit d'accès :</strong> Consulter vos données</p>
                    <p><strong>Droit de rectification :</strong> Corriger vos données</p>
                    <p><strong>Droit à l'effacement :</strong> Supprimer vos données</p>
                  </div>
                  <div>
                    <p><strong>Droit à la portabilité :</strong> Récupérer vos données</p>
                    <p><strong>Droit d'opposition :</strong> Refuser certains traitements</p>
                    <p><strong>Droit de limitation :</strong> Limiter l'utilisation</p>
                  </div>
                </div>
                <p className="mt-4 text-blue-800">
                  Pour exercer ces droits, contactez-nous à : <strong>privacy@nexusclim.fr</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Conservation des données</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Type de données</th>
                      <th className="px-4 py-2 text-left font-semibold">Durée de conservation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2">Données de compte actif</td>
                      <td className="px-4 py-2">Tant que le compte est actif</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Données de missions</td>
                      <td className="px-4 py-2">5 ans après la fin de mission</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Logs de connexion</td>
                      <td className="px-4 py-2">12 mois maximum</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Données de géolocalisation</td>
                      <td className="px-4 py-2">24 heures maximum</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Délégué à la Protection des Données (DPO) :</strong></p>
                <p>Email : privacy@nexusclim.fr</p>
                <p>Adresse : Nexus Clim - DPO, 123 Avenue de la Climatisation, 75001 Paris</p>
                <p className="mt-2 text-sm text-gray-600">
                  Nous nous engageons à répondre à toute demande dans un délai de 30 jours maximum.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              consentement explicite pour optimiser l'attribution des missions selon votre zone d'intervention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}