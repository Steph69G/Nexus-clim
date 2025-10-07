import { Link } from "react-router-dom";
import { MapPin, Navigation, Clock, Zap, Map, Smartphone } from "lucide-react";

export default function GeolocationIntelligente() {
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Géolocalisation intelligente</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Optimisez vos déplacements et trouvez automatiquement le technicien le plus proche de chaque intervention
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-green-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  Notre système de géolocalisation intelligente révolutionne la gestion de vos interventions en optimisant 
                  automatiquement l'attribution des missions selon la proximité géographique. Réduisez vos coûts de déplacement, 
                  améliorez vos temps de réponse et maximisez l'efficacité de vos équipes.
                </p>
              </div>
            </section>

            {/* Fonctionnalités principales */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités principales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Navigation className="w-6 h-6 text-blue-600" />}
                  title="Attribution automatique"
                  description="Le système sélectionne automatiquement le technicien le plus proche de chaque mission."
                />
                
                <FeatureCard
                  icon={<Map className="w-6 h-6 text-green-600" />}
                  title="Visualisation cartographique"
                  description="Consultez toutes vos missions et équipes sur une carte interactive en temps réel."
                />
                
                <FeatureCard
                  icon={<Clock className="w-6 h-6 text-orange-600" />}
                  title="Optimisation des trajets"
                  description="Calculez automatiquement les itinéraires les plus efficaces pour vos techniciens."
                />
                
                <FeatureCard
                  icon={<Zap className="w-6 h-6 text-purple-600" />}
                  title="Temps de réponse réduit"
                  description="Diminuez significativement les délais d'intervention grâce à l'optimisation géographique."
                />
                
                <FeatureCard
                  icon={<Smartphone className="w-6 h-6 text-indigo-600" />}
                  title="Suivi en temps réel"
                  description="Suivez la position de vos équipes et l'avancement des missions en direct."
                />
                
                <FeatureCard
                  icon={<MapPin className="w-6 h-6 text-red-600" />}
                  title="Zones d'intervention"
                  description="Définissez des périmètres d'intervention personnalisés pour chaque technicien."
                />
              </div>
            </section>

            {/* Comment ça marche */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Comment ça marche</h2>
              <div className="space-y-6">
                <StepCard
                  number="1"
                  title="Géocodage automatique"
                  description="Chaque adresse de mission est automatiquement convertie en coordonnées GPS précises."
                />
                <StepCard
                  number="2"
                  title="Localisation des équipes"
                  description="Le système connaît la position de chaque technicien et sa zone d'intervention préférée."
                />
                <StepCard
                  number="3"
                  title="Calcul de proximité"
                  description="L'algorithme calcule les distances et temps de trajet pour identifier le technicien optimal."
                />
                <StepCard
                  number="4"
                  title="Attribution intelligente"
                  description="La mission est proposée en priorité aux techniciens les plus proches et disponibles."
                />
              </div>
            </section>

            {/* Avantages mesurables */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Avantages mesurables</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  value="-40%"
                  label="Temps de déplacement"
                  description="Réduction moyenne des temps de trajet grâce à l'optimisation géographique"
                  color="green"
                />
                <MetricCard
                  value="+60%"
                  label="Interventions/jour"
                  description="Augmentation du nombre d'interventions possibles par technicien"
                  color="blue"
                />
                <MetricCard
                  value="-30%"
                  label="Coûts carburant"
                  description="Économies sur les frais de déplacement et l'usure des véhicules"
                  color="orange"
                />
              </div>
            </section>

            {/* Fonctionnalités avancées */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités avancées</h2>
              <div className="space-y-4">
                <AdvancedFeature
                  title="Prédiction de trafic"
                  description="Intégration des données de trafic en temps réel pour optimiser les horaires de départ."
                />
                <AdvancedFeature
                  title="Zones de blacklist"
                  description="Possibilité pour les techniciens d'exclure certaines zones de leur périmètre d'intervention."
                />
                <AdvancedFeature
                  title="Historique des déplacements"
                  description="Analyse des patterns de déplacement pour améliorer continuellement l'optimisation."
                />
                <AdvancedFeature
                  title="Intégration GPS"
                  description="Synchronisation avec les systèmes GPS des véhicules pour un suivi précis."
                />
              </div>
            </section>

            {/* Cas d'usage */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Cas d'usage typiques</h2>
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="space-y-4">
                  <UseCaseExample
                    scenario="Urgence climatisation"
                    description="Un client signale une panne de climatisation. Le système identifie immédiatement le technicien le plus proche (à 8 minutes) plutôt que d'envoyer celui initialement prévu (à 35 minutes)."
                  />
                  <UseCaseExample
                    scenario="Optimisation de tournée"
                    description="Pour 5 interventions dans la même zone, le système groupe les missions et propose un itinéraire optimisé, réduisant le temps total de 3h à 1h45."
                  />
                  <UseCaseExample
                    scenario="Répartition équitable"
                    description="Le système équilibre automatiquement la charge de travail en évitant qu'un technicien accumule toutes les missions d'une zone."
                  />
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-green-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Optimisez vos déplacements dès aujourd'hui</h2>
              <p className="text-green-100 mb-6">
                Réduisez vos coûts et améliorez votre efficacité avec notre géolocalisation intelligente
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
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

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
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

function AdvancedFeature({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm">{description}</p>
    </div>
  );
}

function UseCaseExample({ scenario, description }: {
  scenario: string;
  description: string;
}) {
  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <h3 className="font-semibold text-blue-900 mb-2">{scenario}</h3>
      <p className="text-blue-800 text-sm">{description}</p>
    </div>
  );
}