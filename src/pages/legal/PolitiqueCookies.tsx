import { Link } from "react-router-dom";
import { useState } from "react";

export default function PolitiqueCookies() {
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true, // Toujours activé
    analytics: false,
    marketing: false,
    preferences: false,
  });

  const handleSavePreferences = () => {
    // Ici on sauvegarderait les préférences dans localStorage ou via une API
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    alert('Préférences sauvegardées !');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique des cookies</h1>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Qu'est-ce qu'un cookie ?</h2>
              <p>
                Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette, smartphone) 
                lorsque vous visitez un site web. Les cookies permettent au site de mémoriser vos actions et 
                préférences pendant une période donnée.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-blue-800">
                  <strong>Bon à savoir :</strong> Les cookies ne peuvent pas endommager votre appareil ni 
                  contenir de virus. Ils améliorent votre expérience de navigation.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Types de cookies utilisés</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">🔒 Cookies nécessaires</h3>
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Obligatoires</strong> - Ne peuvent pas être désactivés
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Authentification utilisateur</li>
                    <li>• Sécurité des sessions</li>
                    <li>• Préférences de langue</li>
                    <li>• Panier de commande</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">📊 Cookies analytiques</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Optionnels</strong> - Amélioration du service
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Statistiques de visite</li>
                    <li>• Pages les plus consultées</li>
                    <li>• Temps passé sur le site</li>
                    <li>• Parcours utilisateur</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-3">⚙️ Cookies de préférences</h3>
                  <p className="text-sm text-purple-700 mb-2">
                    <strong>Optionnels</strong> - Personnalisation
                  </p>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Thème d'affichage</li>
                    <li>• Taille de police</li>
                    <li>• Préférences de notification</li>
                    <li>• Paramètres d'interface</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-800 mb-3">📢 Cookies marketing</h3>
                  <p className="text-sm text-orange-700 mb-2">
                    <strong>Optionnels</strong> - Communication ciblée
                  </p>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Publicités personnalisées</li>
                    <li>• Suivi des conversions</li>
                    <li>• Réseaux sociaux</li>
                    <li>• Remarketing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Cookies tiers utilisés</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Service</th>
                      <th className="px-4 py-2 text-left font-semibold">Finalité</th>
                      <th className="px-4 py-2 text-left font-semibold">Durée</th>
                      <th className="px-4 py-2 text-left font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2">Supabase Auth</td>
                      <td className="px-4 py-2">Authentification utilisateur</td>
                      <td className="px-4 py-2">Session</td>
                      <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Nécessaire</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Google Maps</td>
                      <td className="px-4 py-2">Géolocalisation et cartes</td>
                      <td className="px-4 py-2">Session</td>
                      <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Nécessaire</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Google Analytics</td>
                      <td className="px-4 py-2">Statistiques d'utilisation</td>
                      <td className="px-4 py-2">2 ans</td>
                      <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Analytique</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Gestion de vos préférences</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Configurez vos préférences de cookies :</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <h4 className="font-medium">Cookies nécessaires</h4>
                      <p className="text-sm text-gray-600">Requis pour le fonctionnement du site</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cookiePreferences.necessary}
                        disabled
                        className="h-4 w-4 text-green-600 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-500">Toujours activé</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <h4 className="font-medium">Cookies analytiques</h4>
                      <p className="text-sm text-gray-600">Nous aident à améliorer le site</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookiePreferences.analytics}
                        onChange={(e) => setCookiePreferences(prev => ({
                          ...prev,
                          analytics: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-sm">Autoriser</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <h4 className="font-medium">Cookies de préférences</h4>
                      <p className="text-sm text-gray-600">Mémorisent vos choix d'interface</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookiePreferences.preferences}
                        onChange={(e) => setCookiePreferences(prev => ({
                          ...prev,
                          preferences: e.target.checked
                        }))}
                        className="h-4 w-4 text-purple-600 rounded"
                      />
                      <span className="ml-2 text-sm">Autoriser</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <h4 className="font-medium">Cookies marketing</h4>
                      <p className="text-sm text-gray-600">Publicités et contenu personnalisés</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookiePreferences.marketing}
                        onChange={(e) => setCookiePreferences(prev => ({
                          ...prev,
                          marketing: e.target.checked
                        }))}
                        className="h-4 w-4 text-orange-600 rounded"
                      />
                      <span className="ml-2 text-sm">Autoriser</span>
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSavePreferences}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sauvegarder mes préférences
                  </button>
                  <button
                    onClick={() => setCookiePreferences({
                      necessary: true,
                      analytics: true,
                      marketing: true,
                      preferences: true,
                    })}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Tout accepter
                  </button>
                  <button
                    onClick={() => setCookiePreferences({
                      necessary: true,
                      analytics: false,
                      marketing: false,
                      preferences: false,
                    })}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Tout refuser
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Gestion via votre navigateur</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">🌐 Chrome</h3>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Menu → Paramètres</li>
                    <li>Confidentialité et sécurité</li>
                    <li>Cookies et autres données</li>
                    <li>Gérer les cookies</li>
                  </ol>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">🦊 Firefox</h3>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Menu → Paramètres</li>
                    <li>Vie privée et sécurité</li>
                    <li>Cookies et données de sites</li>
                    <li>Gérer les données</li>
                  </ol>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">🧭 Safari</h3>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Safari → Préférences</li>
                    <li>Confidentialité</li>
                    <li>Gérer les données de sites web</li>
                    <li>Supprimer ou modifier</li>
                  </ol>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">🔷 Edge</h3>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Menu → Paramètres</li>
                    <li>Cookies et autorisations</li>
                    <li>Cookies et données stockées</li>
                    <li>Voir tous les cookies</li>
                  </ol>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Impact de la désactivation</h2>
              
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-800 mb-2">⚠️ Attention</h3>
                <p className="text-amber-700 text-sm">
                  La désactivation de certains cookies peut affecter le fonctionnement du site :
                </p>
                <ul className="text-amber-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Perte des préférences utilisateur</li>
                  <li>Déconnexions fréquentes</li>
                  <li>Fonctionnalités limitées</li>
                  <li>Expérience utilisateur dégradée</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Mise à jour de cette politique</h2>
              <p>
                Cette politique des cookies peut être mise à jour pour refléter les changements dans nos 
                pratiques ou pour d'autres raisons opérationnelles, légales ou réglementaires.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-blue-800">
                  <strong>Notification :</strong> Nous vous informerons de tout changement significatif 
                  par email ou via une notification sur le site.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Questions sur les cookies :</strong></p>
                <p>Email : privacy@nexusclim.fr</p>
                <p>Téléphone : 01 23 45 67 89</p>
                <p>Adresse : Nexus Clim SAS, 123 Avenue de la Climatisation, 75001 Paris</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : 15 janvier 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}