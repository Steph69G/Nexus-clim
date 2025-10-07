import { Link } from "react-router-dom";

export default function ConditionsUtilisation() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions générales d'utilisation</h1>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Objet</h2>
              <p>
                Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de la plateforme 
                Nexus Clim, service de gestion et d'optimisation des interventions de climatisation proposé par 
                la société Nexus Clim SAS.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-blue-800">
                  <strong>En utilisant notre plateforme, vous acceptez intégralement ces conditions.</strong> 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Définitions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Utilisateurs</h3>
                  <ul className="text-sm space-y-1">
                    <li><strong>Admin :</strong> Gestionnaire de missions</li>
                    <li><strong>Technicien :</strong> Employé interne</li>
                    <li><strong>ST :</strong> Sous-traitant externe</li>
                    <li><strong>SAL :</strong> Salarié partenaire</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Services</h3>
                  <ul className="text-sm space-y-1">
                    <li><strong>Mission :</strong> Intervention climatisation</li>
                    <li><strong>Offre :</strong> Proposition de mission</li>
                    <li><strong>Plateforme :</strong> Application Nexus Clim</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Accès aux services</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">3.1 Inscription</h3>
              <p>
                L'accès à la plateforme nécessite une inscription préalable. Vous vous engagez à fournir 
                des informations exactes, complètes et à jour.
              </p>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">3.2 Compte utilisateur</h3>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-amber-800">
                  <strong>Responsabilité :</strong> Vous êtes responsable de la confidentialité de vos 
                  identifiants de connexion et de toutes les activités effectuées sous votre compte.
                </p>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">3.3 Conditions techniques</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Connexion Internet stable</li>
                <li>Navigateur web récent (Chrome, Firefox, Safari, Edge)</li>
                <li>Autorisation de géolocalisation (pour les fonctionnalités de carte)</li>
                <li>Adresse email valide</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Utilisation des services</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">✅ Usages autorisés</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Gestion professionnelle des missions</li>
                    <li>• Communication avec les équipes</li>
                    <li>• Consultation des données de missions</li>
                    <li>• Mise à jour de votre profil</li>
                    <li>• Utilisation des outils de géolocalisation</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-3">❌ Usages interdits</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Utilisation à des fins personnelles</li>
                    <li>• Partage non autorisé de données</li>
                    <li>• Tentative de piratage ou intrusion</li>
                    <li>• Utilisation de robots ou scripts</li>
                    <li>• Revente ou redistribution du service</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Obligations des utilisateurs</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">5.1 Professionnels (ST/SAL/Techniciens)</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="text-blue-800 space-y-2">
                  <li>• Maintenir vos qualifications professionnelles à jour</li>
                  <li>• Respecter les délais et créneaux acceptés</li>
                  <li>• Fournir un travail de qualité conforme aux standards</li>
                  <li>• Communiquer rapidement tout problème ou retard</li>
                  <li>• Respecter la confidentialité des données clients</li>
                </ul>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">5.2 Administrateurs</h3>
              <div className="bg-purple-50 p-4 rounded-lg">
                <ul className="text-purple-800 space-y-2">
                  <li>• Créer des missions avec des informations complètes et exactes</li>
                  <li>• Respecter les délais de paiement des sous-traitants</li>
                  <li>• Assurer un suivi approprié des missions</li>
                  <li>• Maintenir la confidentialité des données personnelles</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Propriété intellectuelle</h2>
              <p>
                La plateforme Nexus Clim, son code source, ses bases de données, son design et tous les 
                éléments qui la composent sont protégés par le droit d'auteur et appartiennent exclusivement 
                à Nexus Clim SAS.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <h3 className="font-semibold mb-2">Licence d'utilisation</h3>
                <p className="text-sm text-gray-700">
                  Nous vous accordons une licence non exclusive, non transférable et révocable d'utilisation 
                  de la plateforme dans le cadre de votre activité professionnelle.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Responsabilité</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">7.1 Responsabilité de Nexus Clim</h3>
              <p>
                Nexus Clim s'engage à fournir un service de qualité mais ne peut garantir une disponibilité 
                de 100% de la plateforme. Notre responsabilité est limitée aux dommages directs prouvés.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">7.2 Responsabilité des utilisateurs</h3>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-orange-800">
                  <strong>Important :</strong> Chaque utilisateur est responsable de ses actions sur la plateforme 
                  et des conséquences de l'utilisation des informations fournies par le service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Tarification et paiement</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Type d'utilisateur</th>
                      <th className="px-4 py-2 text-left font-semibold">Modèle tarifaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2">Administrateurs</td>
                      <td className="px-4 py-2">Abonnement mensuel selon le nombre d'utilisateurs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Techniciens internes</td>
                      <td className="px-4 py-2">Inclus dans l'abonnement administrateur</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Sous-traitants (ST/SAL)</td>
                      <td className="px-4 py-2">Commission sur les missions acceptées</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Résiliation</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">9.1 Résiliation par l'utilisateur</h3>
              <p>
                Vous pouvez résilier votre compte à tout moment en nous contactant. La résiliation prend 
                effet à la fin de la période d'abonnement en cours.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-3 mt-6">9.2 Résiliation par Nexus Clim</h3>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800">
                  Nous nous réservons le droit de suspendre ou résilier votre accès en cas de non-respect 
                  des présentes conditions, avec un préavis de 30 jours sauf en cas de violation grave.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Modifications des CGU</h2>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications 
                importantes vous seront notifiées par email au moins 30 jours avant leur entrée en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Droit applicable et juridiction</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  Les présentes conditions sont régies par le droit français. En cas de litige, et après 
                  tentative de résolution amiable, les tribunaux de Paris seront seuls compétents.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p><strong>Pour toute question concernant ces conditions :</strong></p>
                <p>Email : legal@nexusclim.fr</p>
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