import { Link } from "react-router-dom";
import { Users, UserCheck, MapPin, Clock, MessageSquare, Settings } from "lucide-react";

export default function GestionEquipe() {
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Gestion d'équipe</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Coordonnez efficacement vos techniciens, sous-traitants et salariés depuis une interface centralisée
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-blue-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  La gestion d'équipe dans Nexus Clim vous permet de superviser et coordonner l'ensemble de vos ressources humaines. 
                  Que vous travailliez avec des techniciens internes, des sous-traitants externes ou des salariés partenaires, 
                  notre plateforme centralise toutes les informations et facilite la communication.
                </p>
              </div>
            </section>

            {/* Fonctionnalités principales */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités principales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<UserCheck className="w-6 h-6 text-green-600" />}
                  title="Attribution automatique"
                  description="Assignez automatiquement les missions selon les compétences, la localisation et la disponibilité de vos équipes."
                />
                
                <FeatureCard
                  icon={<MapPin className="w-6 h-6 text-purple-600" />}
                  title="Suivi géographique"
                  description="Visualisez en temps réel la position de vos techniciens et optimisez les déplacements."
                />
                
                <FeatureCard
                  icon={<Clock className="w-6 h-6 text-orange-600" />}
                  title="Planning centralisé"
                  description="Gérez les plannings de toute votre équipe depuis une interface unique et intuitive."
                />
                
                <FeatureCard
                  icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
                  title="Communication intégrée"
                  description="Communiquez directement avec vos équipes via la plateforme, avec historique des échanges."
                />
                
                <FeatureCard
                  icon={<Settings className="w-6 h-6 text-gray-600" />}
                  title="Gestion des rôles"
                  description="Définissez des rôles et permissions personnalisés pour chaque membre de votre équipe."
                />
                
                <FeatureCard
                  icon={<Users className="w-6 h-6 text-indigo-600" />}
                  title="Profils détaillés"
                  description="Consultez les profils complets : compétences, historique, évaluations et disponibilités."
                />
              </div>
            </section>

            {/* Types d'utilisateurs */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Types d'utilisateurs gérés</h2>
              <div className="space-y-4">
                <UserTypeCard
                  title="Techniciens internes (TECH)"
                  description="Vos employés permanents avec accès complet aux outils et formations internes."
                  color="blue"
                />
                <UserTypeCard
                  title="Sous-traitants (ST)"
                  description="Partenaires externes spécialisés qui interviennent selon leurs compétences et zones géographiques."
                  color="green"
                />
                <UserTypeCard
                  title="Salariés partenaires (SAL)"
                  description="Collaborateurs d'entreprises partenaires avec accès limité aux missions spécifiques."
                  color="purple"
                />
                <UserTypeCard
                  title="Administrateurs (ADMIN)"
                  description="Gestionnaires avec droits complets sur la plateforme et les équipes."
                  color="orange"
                />
              </div>
            </section>

            {/* Avantages */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Avantages</h2>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-green-800 mb-3">Pour les gestionnaires</h3>
                    <ul className="space-y-2 text-green-700">
                      <li>• Vue d'ensemble complète de toutes les équipes</li>
                      <li>• Attribution optimisée des missions</li>
                      <li>• Suivi des performances en temps réel</li>
                      <li>• Réduction des temps de coordination</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 mb-3">Pour les équipes</h3>
                    <ul className="space-y-2 text-green-700">
                      <li>• Missions adaptées à leurs compétences</li>
                      <li>• Communication simplifiée</li>
                      <li>• Autonomie dans la gestion de leur planning</li>
                      <li>• Visibilité sur les opportunités</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Comment ça marche */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Comment ça marche</h2>
              <div className="space-y-6">
                <StepCard
                  number="1"
                  title="Configuration des profils"
                  description="Créez et configurez les profils de vos équipes avec leurs compétences, zones d'intervention et disponibilités."
                />
                <StepCard
                  number="2"
                  title="Attribution des missions"
                  description="Le système propose automatiquement les techniciens les plus adaptés selon les critères de la mission."
                />
                <StepCard
                  number="3"
                  title="Suivi en temps réel"
                  description="Suivez l'avancement des missions et la localisation de vos équipes via le tableau de bord."
                />
                <StepCard
                  number="4"
                  title="Communication et feedback"
                  description="Échangez avec vos équipes et collectez les retours pour améliorer continuellement les processus."
                />
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-blue-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Prêt à optimiser la gestion de vos équipes ?</h2>
              <p className="text-blue-100 mb-6">
                Découvrez comment Nexus Clim peut transformer la coordination de vos interventions
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Commencer maintenant
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

function UserTypeCard({ title, description, color }: {
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50'
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} p-4 rounded-r-lg`}>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}