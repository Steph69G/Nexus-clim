import { Link } from "react-router-dom";
import { Clock, Calendar, Users, Zap, BarChart3, Settings } from "lucide-react";

export default function PlanificationAvancee() {
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
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Planification avancée</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Programmez vos interventions, gérez les créneaux et optimisez votre planning avec notre système intelligent
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-orange-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  Notre système de planification avancée transforme la gestion de vos interventions en un processus fluide et optimisé. 
                  Grâce à l'intelligence artificielle et aux algorithmes d'optimisation, planifiez automatiquement vos missions 
                  en tenant compte des contraintes de temps, de localisation et de compétences de vos équipes.
                </p>
              </div>
            </section>

            {/* Fonctionnalités principales */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités principales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Calendar className="w-6 h-6 text-blue-600" />}
                  title="Planning intelligent"
                  description="Algorithme qui optimise automatiquement l'organisation des missions selon vos contraintes."
                />
                
                <FeatureCard
                  icon={<Users className="w-6 h-6 text-green-600" />}
                  title="Gestion des disponibilités"
                  description="Synchronisation avec les calendriers personnels et gestion des congés/absences."
                />
                
                <FeatureCard
                  icon={<Zap className="w-6 h-6 text-purple-600" />}
                  title="Optimisation automatique"
                  description="Réorganisation dynamique du planning en cas d'imprévu ou de nouvelle urgence."
                />
                
                <FeatureCard
                  icon={<BarChart3 className="w-6 h-6 text-orange-600" />}
                  title="Analyse de charge"
                  description="Visualisation de la charge de travail et équilibrage automatique entre les équipes."
                />
                
                <FeatureCard
                  icon={<Settings className="w-6 h-6 text-indigo-600" />}
                  title="Règles personnalisées"
                  description="Définition de règles métier spécifiques à votre organisation et vos contraintes."
                />
                
                <FeatureCard
                  icon={<Clock className="w-6 h-6 text-red-600" />}
                  title="Créneaux flexibles"
                  description="Gestion des créneaux de disponibilité client et optimisation des fenêtres d'intervention."
                />
              </div>
            </section>

            {/* Types de planification */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Types de planification</h2>
              <div className="space-y-4">
                <PlanningTypeCard
                  title="Planification automatique"
                  description="Le système organise automatiquement toutes les missions selon vos critères d'optimisation."
                  features={["Optimisation globale", "Prise en compte des contraintes", "Mise à jour en temps réel"]}
                  color="blue"
                />
                
                <PlanningTypeCard
                  title="Planification assistée"
                  description="Vous gardez le contrôle tout en bénéficiant des suggestions intelligentes du système."
                  features={["Suggestions d'optimisation", "Validation manuelle", "Flexibilité maximale"]}
                  color="green"
                />
                
                <PlanningTypeCard
                  title="Planification d'urgence"
                  description="Insertion automatique des missions urgentes avec réorganisation du planning existant."
                  features={["Priorisation automatique", "Réorganisation intelligente", "Notification des équipes"]}
                  color="red"
                />
              </div>
            </section>

            {/* Critères d'optimisation */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Critères d'optimisation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">🎯 Critères géographiques</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Minimisation des distances de déplacement</li>
                    <li>• Regroupement des missions par zone</li>
                    <li>• Prise en compte du trafic et des conditions routières</li>
                    <li>• Optimisation des tournées</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">⏰ Critères temporels</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Respect des créneaux client</li>
                    <li>• Équilibrage de la charge de travail</li>
                    <li>• Gestion des heures supplémentaires</li>
                    <li>• Optimisation des temps morts</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">👥 Critères de compétences</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Adéquation compétences/mission</li>
                    <li>• Niveau d'expérience requis</li>
                    <li>• Certifications spécifiques</li>
                    <li>• Préférences des techniciens</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">💰 Critères économiques</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Minimisation des coûts de déplacement</li>
                    <li>• Optimisation des heures facturables</li>
                    <li>• Équilibrage coût/qualité</li>
                    <li>• Rentabilité par mission</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Fonctionnalités avancées */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités avancées</h2>
              <div className="space-y-4">
                <AdvancedFeature
                  title="Planification prédictive"
                  description="Anticipation des besoins futurs basée sur l'historique et les tendances saisonnières."
                />
                <AdvancedFeature
                  title="Gestion des contraintes complexes"
                  description="Prise en compte de règles métier spécifiques : exclusions, préférences, obligations légales."
                />
                <AdvancedFeature
                  title="Simulation de scénarios"
                  description="Test de différentes configurations de planning avant application réelle."
                />
                <AdvancedFeature
                  title="Intégration calendrier"
                  description="Synchronisation bidirectionnelle avec Google Calendar, Outlook et autres systèmes."
                />
              </div>
            </section>

            {/* Bénéfices mesurables */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Bénéfices mesurables</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  value="+35%"
                  label="Efficacité planning"
                  description="Amélioration de l'utilisation du temps de travail"
                  color="green"
                />
                <MetricCard
                  value="-50%"
                  label="Temps de planification"
                  description="Réduction du temps consacré à l'organisation"
                  color="blue"
                />
                <MetricCard
                  value="+25%"
                  label="Satisfaction client"
                  description="Amélioration du respect des créneaux"
                  color="orange"
                />
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-orange-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Optimisez votre planning dès maintenant</h2>
              <p className="text-orange-100 mb-6">
                Transformez votre gestion du temps avec notre planification intelligente
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
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

function PlanningTypeCard({ title, description, features, color }: {
  title: string;
  description: string;
  features: string[];
  color: 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50'
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} p-4 rounded-r-lg`}>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature, index) => (
          <span key={index} className="text-xs bg-white px-2 py-1 rounded border">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdvancedFeature({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm">{description}</p>
    </div>
  );
}

function MetricCard({ value, label, description, color }: {
  value: string;
  label: string;
  description: string;
  color: 'green' | 'blue' | 'orange';
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-6 text-center`}>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="font-semibold mb-2">{label}</div>
      <div className="text-sm opacity-80">{description}</div>
    </div>
  );
}