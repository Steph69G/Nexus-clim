import { Link } from "react-router-dom";
import { Wrench, Activity, CheckCircle, Clock, FileText, Bell } from "lucide-react";

export default function SuiviInterventions() {
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
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Suivi des interventions</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Suivez le statut de chaque mission en temps réel, de la création à la facturation
            </p>
          </div>

          <div className="space-y-12">
            {/* Vue d'ensemble */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble</h2>
              <div className="bg-indigo-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  Notre système de suivi des interventions vous offre une visibilité complète sur l'ensemble de vos missions. 
                  De la création de la demande jusqu'à la facturation finale, chaque étape est tracée et documentée. 
                  Clients, techniciens et gestionnaires disposent d'informations actualisées en temps réel pour une 
                  coordination parfaite et une satisfaction client optimale.
                </p>
              </div>
            </section>

            {/* Cycle de vie d'une mission */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Cycle de vie d'une mission</h2>
              <div className="space-y-4">
                <StatusStep
                  number="1"
                  status="Création"
                  description="Saisie de la demande client avec toutes les informations nécessaires"
                  color="gray"
                />
                <StatusStep
                  number="2"
                  status="Publiée"
                  description="Mission diffusée aux techniciens éligibles selon les critères définis"
                  color="blue"
                />
                <StatusStep
                  number="3"
                  status="Acceptée"
                  description="Un technicien accepte la mission et elle lui est assignée"
                  color="yellow"
                />
                <StatusStep
                  number="4"
                  status="Planifiée"
                  description="Créneau d'intervention confirmé avec le client"
                  color="orange"
                />
                <StatusStep
                  number="5"
                  status="En cours"
                  description="Technicien sur site, intervention en cours de réalisation"
                  color="purple"
                />
                <StatusStep
                  number="6"
                  status="Terminée"
                  description="Intervention achevée, rapport complété et validé par le client"
                  color="green"
                />
                <StatusStep
                  number="7"
                  status="Facturée"
                  description="Facture générée et envoyée au client"
                  color="indigo"
                />
              </div>
            </section>

            {/* Fonctionnalités de suivi */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fonctionnalités de suivi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<Activity className="w-6 h-6 text-blue-600" />}
                  title="Suivi temps réel"
                  description="Mise à jour instantanée du statut des missions avec notifications automatiques."
                />
                
                <FeatureCard
                  icon={<Bell className="w-6 h-6 text-orange-600" />}
                  title="Alertes intelligentes"
                  description="Notifications proactives en cas de retard, problème ou action requise."
                />
                
                <FeatureCard
                  icon={<FileText className="w-6 h-6 text-green-600" />}
                  title="Rapports détaillés"
                  description="Documentation complète de chaque intervention avec photos et signatures."
                />
                
                <FeatureCard
                  icon={<Clock className="w-6 h-6 text-purple-600" />}
                  title="Historique complet"
                  description="Traçabilité totale avec horodatage de chaque action et changement de statut."
                />
                
                <FeatureCard
                  icon={<CheckCircle className="w-6 h-6 text-indigo-600" />}
                  title="Validation client"
                  description="Signature électronique et validation client directement sur mobile."
                />
                
                <FeatureCard
                  icon={<Wrench className="w-6 h-6 text-red-600" />}
                  title="Gestion des anomalies"
                  description="Signalement et suivi des problèmes avec escalade automatique si nécessaire."
                />
              </div>
            </section>

            {/* Tableaux de bord */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tableaux de bord personnalisés</h2>
              <div className="space-y-4">
                <DashboardCard
                  title="Vue gestionnaire"
                  description="Supervision globale de toutes les missions avec indicateurs de performance et alertes."
                  features={["KPI en temps réel", "Alertes prioritaires", "Analyse de tendances", "Rapports automatisés"]}
                  color="blue"
                />
                
                <DashboardCard
                  title="Vue technicien"
                  description="Planning personnel avec détails des missions assignées et outils de terrain."
                  features={["Missions du jour", "Navigation GPS", "Formulaires mobiles", "Communication client"]}
                  color="green"
                />
                
                <DashboardCard
                  title="Vue client"
                  description="Portail client avec suivi de ses demandes et historique des interventions."
                  features={["Statut en temps réel", "Historique complet", "Évaluations", "Facturation"]}
                  color="purple"
                />
              </div>
            </section>

            {/* Indicateurs de performance */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Indicateurs de performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Temps de réponse"
                  description="Délai moyen entre création et acceptation d'une mission"
                  value="< 2h"
                  color="blue"
                />
                <MetricCard
                  title="Taux de résolution"
                  description="Pourcentage de missions terminées avec succès au premier passage"
                  value="94%"
                  color="green"
                />
                <MetricCard
                  title="Satisfaction client"
                  description="Note moyenne attribuée par les clients après intervention"
                  value="4.8/5"
                  color="orange"
                />
              </div>
            </section>

            {/* Notifications et alertes */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Système de notifications</h2>
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-900 mb-4">Types d'alertes automatiques :</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Alertes opérationnelles</h4>
                    <ul className="space-y-1 text-yellow-700 text-sm">
                      <li>• Nouvelle mission créée</li>
                      <li>• Mission acceptée par un technicien</li>
                      <li>• Retard détecté sur une intervention</li>
                      <li>• Mission terminée et rapport disponible</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Alertes de gestion</h4>
                    <ul className="space-y-1 text-yellow-700 text-sm">
                      <li>• Mission non assignée après 2h</li>
                      <li>• Problème signalé par un technicien</li>
                      <li>• Évaluation client négative</li>
                      <li>• Facture en attente de validation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Intégrations */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Intégrations</h2>
              <div className="space-y-4">
                <IntegrationCard
                  title="Systèmes de facturation"
                  description="Synchronisation automatique avec vos outils comptables (Sage, Ciel, QuickBooks)."
                />
                <IntegrationCard
                  title="CRM existant"
                  description="Import/export des données clients et historique des interventions."
                />
                <IntegrationCard
                  title="Outils de communication"
                  description="Intégration avec email, SMS et systèmes de notification push."
                />
                <IntegrationCard
                  title="Systèmes de géolocalisation"
                  description="Connexion avec les GPS véhicules et applications de navigation."
                />
              </div>
            </section>

            {/* CTA */}
            <section className="text-center bg-indigo-600 rounded-lg p-8 text-white">
              <h2 className="text-2xl font-semibold mb-4">Maîtrisez chaque intervention</h2>
              <p className="text-indigo-100 mb-6">
                Ne perdez plus jamais le fil de vos missions avec notre système de suivi complet
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                Commencer le suivi
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStep({ number, status, description, color }: {
  number: string;
  status: string;
  description: string;
  color: 'gray' | 'blue' | 'yellow' | 'orange' | 'purple' | 'green' | 'indigo';
}) {
  const colorClasses = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <div className="flex gap-4 items-start">
      <div className={`flex-shrink-0 w-8 h-8 ${colorClasses[color]} text-white rounded-full flex items-center justify-center font-semibold text-sm`}>
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{status}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
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

function DashboardCard({ title, description, features, color }: {
  title: string;
  description: string;
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

function MetricCard({ title, description, value, color }: {
  title: string;
  description: string;
  value: string;
  color: 'blue' | 'green' | 'orange';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-6 text-center`}>
      <div className="text-2xl font-bold mb-2">{value}</div>
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm opacity-80">{description}</div>
    </div>
  );
}

function IntegrationCard({ title, description }: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded-r-lg">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm">{description}</p>
    </div>
  );
}