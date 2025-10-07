import { Link } from "react-router-dom";
import { Shield, Lock, Key, Database, Eye, UserCheck } from "lucide-react";

export default function SecuriteDonnees() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Sécurité des données</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Vos données sont protégées avec un système de permissions granulaires et un hébergement sécurisé
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-red-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  La sécurité de vos données est notre priorité absolue. Nexus Clim implémente les standards de sécurité 
                  les plus élevés de l'industrie, avec un chiffrement de bout en bout, des contrôles d'accès granulaires 
                  et une infrastructure hébergée dans des centres de données certifiés. Vos informations sensibles et 
                  celles de vos clients sont protégées selon les normes RGPD et ISO 27001.
                </p>
              </div>
            </section>

            {/* Mesures de sécurité */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Mesures de sécurité</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecurityCard
                  icon={<Lock className="w-6 h-6 text-blue-600" />}
                  title="Chiffrement AES-256"
                  description="Toutes les données sont chiffrées en transit et au repos avec l'algorithme AES-256, standard militaire."
                />
                
                <SecurityCard
                  icon={<Key className="w-6 h-6 text-green-600" />}
                  title="Authentification forte"
                  description="Authentification à deux facteurs (2FA) et gestion avancée des mots de passe."
                />
                
                <SecurityCard
                  icon={<Database className="w-6 h-6 text-purple-600" />}
                  title="Sauvegardes sécurisées"
                  description="Sauvegardes automatiques chiffrées avec rétention sur 30 jours et tests de restauration."
                />
                
                <SecurityCard
                  icon={<Eye className="w-6 h-6 text-orange-600" />}
                  title="Monitoring 24/7"
                  description="Surveillance continue des accès et détection automatique des anomalies."
                />
                
                <SecurityCard
                  icon={<UserCheck className="w-6 h-6 text-indigo-600" />}
                  title="Contrôle d'accès"
                  description="Permissions granulaires par rôle avec principe du moindre privilège."
                />
                
                <SecurityCard
                  icon={<Shield className="w-6 h-6 text-red-600" />}
                  title="Conformité RGPD"
                  description="Respect total du RGPD avec outils de gestion des consentements et droit à l'oubli."
                />
              </div>
            </section>

            {/* Infrastructure */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Infrastructure sécurisée</h2>
              <div className="space-y-4">
                <InfraCard
                  title="Hébergement européen"
                  description="Données hébergées exclusivement en Europe (France/Allemagne) dans des centres certifiés ISO 27001."
                  icon="🇪🇺"
                />
                <InfraCard
                  title="Redondance géographique"
                  description="Réplication des données sur plusieurs sites pour garantir la continuité de service."
                  icon="🔄"
                />
                <InfraCard
                  title="Pare-feu avancé"
                  description="Protection multicouche avec pare-feu applicatif (WAF) et détection d'intrusion."
                  icon="🛡️"
                />
                <InfraCard
                  title="Isolation des données"
                  description="Chaque client dispose d'un environnement isolé avec ses propres clés de chiffrement."
                  icon="🏠"
                />
              </div>
            </section>

            {/* Gestion des accès */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Gestion des accès</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">🔐 Niveaux d'autorisation</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• <strong>Administrateur :</strong> Accès complet à toutes les données</li>
                    <li>• <strong>Gestionnaire :</strong> Gestion des missions et équipes</li>
                    <li>• <strong>Technicien :</strong> Accès aux missions assignées uniquement</li>
                    <li>• <strong>Sous-traitant :</strong> Données limitées aux offres reçues</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">👁️ Traçabilité complète</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Journalisation de tous les accès</li>
                    <li>• Historique des modifications</li>
                    <li>• Géolocalisation des connexions</li>
                    <li>• Alertes en cas d'activité suspecte</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Confidentialité des données */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Confidentialité des données</h2>
              <div className="space-y-4">
                <PrivacyFeature
                  title="Masquage intelligent des adresses"
                  description="Les adresses complètes ne sont révélées qu'aux techniciens ayant accepté la mission, protégeant la vie privée des clients."
                />
                <PrivacyFeature
                  title="Anonymisation des données"
                  description="Possibilité d'anonymiser automatiquement les données personnelles après une période définie."
                />
                <PrivacyFeature
                  title="Consentement granulaire"
                  description="Gestion fine des consentements clients avec possibilité de retrait à tout moment."
                />
                <PrivacyFeature
                  title="Droit à l'oubli"
                  description="Suppression complète et irréversible des données sur demande, conformément au RGPD."
                />
              </div>
            </section>

            {/* Certifications */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Certifications et conformité</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CertificationCard
                  title="RGPD"
                  description="Conformité totale au Règlement Général sur la Protection des Données"
                  icon="🇪🇺"
                />
                <CertificationCard
                  title="ISO 27001"
                  description="Certification de sécurité de l'information reconnue internationalement"
                  icon="🏆"
                />
                <CertificationCard
                  title="SOC 2 Type II"
                  description="Audit indépendant des contrôles de sécurité et de disponibilité"
                  icon="✅"
                />
              </div>
            </section>

            {/* Bonnes pratiques */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Bonnes pratiques recommandées</h2>
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">Pour maximiser la sécurité :</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Pour les administrateurs</h4>
                    <ul className="space-y-1 text-blue-700 text-sm">
                      <li>• Activez l'authentification à deux facteurs</li>
                      <li>• Révisez régulièrement les permissions</li>
                      <li>• Surveillez les journaux d'accès</li>
                      <li>• Formez vos équipes aux bonnes pratiques</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Pour les utilisateurs</h4>
                    <ul className="space-y-1 text-blue-700 text-sm">
                      <li>• Utilisez des mots de passe forts et uniques</li>
                      <li>• Ne partagez jamais vos identifiants</li>
                      <li>• Déconnectez-vous après utilisation</li>
                      <li>• Signalez toute activité suspecte</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-red-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Vos données en sécurité maximale</h2>
              <p className="text-red-100 mb-6">
                Faites confiance à notre expertise en sécurité pour protéger vos informations les plus sensibles
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Découvrir la sécurité
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}

function InfraCard({ title, description, icon }: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4 bg-red-50 rounded-lg p-4">
      <div className="text-2xl">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-700 text-sm">{description}</p>
      </div>
    </div>
  );
}

function PrivacyFeature({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm">{description}</p>
    </div>
  );
}

function CertificationCard({ title, description, icon }: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}