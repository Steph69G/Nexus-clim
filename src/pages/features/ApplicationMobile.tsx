import { Link } from "react-router-dom";
import { Smartphone, Wifi, Download, Bell, Camera, MapPin } from "lucide-react";

export default function ApplicationMobile() {
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
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Application mobile</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Interface responsive adaptée aux mobiles et tablettes. Vos équipes restent connectées même sur le terrain
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-purple-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  Nexus Clim est conçu comme une Progressive Web App (PWA) qui s'adapte parfaitement à tous les appareils. 
                  Que vos techniciens utilisent un smartphone, une tablette ou un ordinateur portable, ils bénéficient 
                  d'une expérience optimale avec toutes les fonctionnalités essentielles à portée de main.
                </p>
              </div>
            </section>

            {/* Fonctionnalités mobiles */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités mobiles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Wifi className="w-6 h-6 text-blue-600" />}
                  title="Mode hors ligne"
                  description="Consultez les missions et saisissez les rapports même sans connexion internet."
                />
                
                <FeatureCard
                  icon={<Bell className="w-6 h-6 text-orange-600" />}
                  title="Notifications push"
                  description="Recevez instantanément les nouvelles missions et mises à jour importantes."
                />
                
                <FeatureCard
                  icon={<Camera className="w-6 h-6 text-green-600" />}
                  title="Prise de photos"
                  description="Capturez directement les photos avant/après intervention depuis l'application."
                />
                
                <FeatureCard
                  icon={<MapPin className="w-6 h-6 text-red-600" />}
                  title="GPS intégré"
                  description="Navigation directe vers les missions avec calcul d'itinéraire optimisé."
                />
                
                <FeatureCard
                  icon={<Download className="w-6 h-6 text-purple-600" />}
                  title="Installation native"
                  description="Installez l'app sur l'écran d'accueil comme une application native."
                />
                
                <FeatureCard
                  icon={<Smartphone className="w-6 h-6 text-indigo-600" />}
                  title="Interface tactile"
                  description="Interface optimisée pour les écrans tactiles avec gestes intuitifs."
                />
              </div>
            </section>

            {/* Avantages terrain */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Avantages sur le terrain</h2>
              <div className="space-y-4">
                <AdvantageCard
                  title="Mobilité totale"
                  description="Accédez à toutes les informations nécessaires directement depuis votre poche, sans avoir besoin d'un ordinateur portable encombrant."
                  icon="📱"
                />
                <AdvantageCard
                  title="Mise à jour instantanée"
                  description="Les modifications apportées sur le terrain sont immédiatement synchronisées avec le bureau central."
                  icon="⚡"
                />
                <AdvantageCard
                  title="Économie de temps"
                  description="Fini les allers-retours au bureau pour récupérer les informations ou déposer les rapports."
                  icon="⏰"
                />
                <AdvantageCard
                  title="Qualité des données"
                  description="Saisie des informations en temps réel sur site, réduisant les erreurs et oublis."
                  icon="✅"
                />
              </div>
            </section>

            {/* Compatibilité */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Compatibilité</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">📱 Smartphones</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• iPhone (iOS 12+)</li>
                    <li>• Android (version 8+)</li>
                    <li>• Interface adaptative selon la taille d'écran</li>
                    <li>• Gestes tactiles optimisés</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">📟 Tablettes</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• iPad (iPadOS 13+)</li>
                    <li>• Tablettes Android</li>
                    <li>• Surface et autres tablettes Windows</li>
                    <li>• Mode paysage et portrait</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Fonctionnalités par rôle */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités par rôle</h2>
              <div className="space-y-6">
                <RoleCard
                  title="Techniciens sur le terrain"
                  features={[
                    "Consultation des missions assignées",
                    "Navigation GPS vers les interventions",
                    "Prise de photos avant/après",
                    "Saisie des rapports d'intervention",
                    "Signature client sur écran tactile",
                    "Gestion du statut des missions"
                  ]}
                  color="blue"
                />
                
                <RoleCard
                  title="Sous-traitants"
                  features={[
                    "Réception des offres de mission",
                    "Acceptation/refus en un clic",
                    "Consultation des détails de mission",
                    "Mise à jour de la localisation",
                    "Communication avec le dispatch"
                  ]}
                  color="green"
                />
                
                <RoleCard
                  title="Gestionnaires"
                  features={[
                    "Tableau de bord mobile",
                    "Suivi des équipes en temps réel",
                    "Attribution d'urgence de missions",
                    "Validation des rapports",
                    "Communication avec les équipes"
                  ]}
                  color="purple"
                />
              </div>
            </section>

            {/* Installation */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Installation</h2>
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">Comment installer l'application</h3>
                <div className="space-y-4">
                  <InstallStep
                    platform="iOS (iPhone/iPad)"
                    steps={[
                      "Ouvrez Safari et naviguez vers nexusclim.fr",
                      "Appuyez sur le bouton de partage (carré avec flèche)",
                      "Sélectionnez 'Ajouter à l'écran d'accueil'",
                      "Confirmez l'installation"
                    ]}
                  />
                  <InstallStep
                    platform="Android"
                    steps={[
                      "Ouvrez Chrome et naviguez vers nexusclim.fr",
                      "Appuyez sur le menu (3 points) en haut à droite",
                      "Sélectionnez 'Ajouter à l'écran d'accueil'",
                      "Confirmez l'installation"
                    ]}
                  />
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-purple-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Emportez Nexus Clim partout avec vous</h2>
              <p className="text-purple-100 mb-6">
                Restez connecté et productif, que vous soyez au bureau ou sur le terrain
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Tester sur mobile
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
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

function AdvantageCard({ title, description, icon }: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4 bg-purple-50 rounded-lg p-4">
      <div className="text-2xl">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-700 text-sm">{description}</p>
      </div>
    </div>
  );
}

function RoleCard({ title, features, color }: {
  title: string;
  features: string[];
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50'
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} p-4 rounded-r-lg`}>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-1">
        {features.map((feature, index) => (
          <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
            <span className="text-green-600 mt-1">•</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstallStep({ platform, steps }: {
  platform: string;
  steps: string[];
}) {
  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <h4 className="font-semibold text-blue-900 mb-2">{platform}</h4>
      <ol className="space-y-1">
        {steps.map((step, index) => (
          <li key={index} className="text-blue-800 text-sm">
            {index + 1}. {step}
          </li>
        ))}
      </ol>
    </div>
  );
}