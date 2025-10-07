import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { 
  Wrench, 
  MapPin, 
  Clock, 
  Users, 
  Shield, 
  Smartphone,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Building2,
  Phone,
  Mail
} from "lucide-react";

export default function AppHome() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium">Plateforme de gestion d'interventions</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              Nexus <span className="text-blue-400">Clim</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 max-w-4xl mx-auto leading-relaxed">
              La plateforme qui révolutionne la gestion des interventions climatisation. 
              <span className="text-blue-300">Connectez vos équipes</span>, <span className="text-indigo-300">optimisez vos missions</span>, 
              <span className="text-purple-300">développez votre activité</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all transform hover:scale-105 shadow-2xl"
                  >
                    Commencer maintenant
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="#features"
                    className="inline-flex items-center gap-3 border-2 border-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 backdrop-blur-sm transition-all"
                  >
                    Découvrir les fonctionnalités
                  </Link>
                </>
              ) : (
                <Link
                  to={profile?.role === "admin" ? "/admin" : profile?.role === "tech" ? "/tech" : "/offers"}
                  className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all transform hover:scale-105 shadow-2xl"
                >
                  Accéder à mon espace
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Une solution complète pour tous vos besoins
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Nexus Clim centralise la gestion de vos interventions climatisation avec des outils modernes 
              et une interface intuitive adaptée à chaque profil utilisateur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-600" />}
              title="Gestion d'équipe"
              description="Coordonnez vos techniciens, sous-traitants et salariés depuis une interface centralisée. Assignez les missions en temps réel."
              link="/features/gestion-equipe"
            />
            
            <FeatureCard
              icon={<MapPin className="w-8 h-8 text-emerald-600" />}
              title="Géolocalisation intelligente"
              description="Visualisez vos missions sur carte, optimisez les déplacements et trouvez automatiquement le technicien le plus proche."
              link="/features/geolocalisation-intelligente"
            />
            
            <FeatureCard
              icon={<Smartphone className="w-8 h-8 text-violet-600" />}
              title="Application mobile"
              description="Interface responsive adaptée aux mobiles et tablettes. Vos équipes restent connectées même sur le terrain."
              link="/features/application-mobile"
            />
            
            <FeatureCard
              icon={<Clock className="w-8 h-8 text-amber-600" />}
              title="Planification avancée"
              description="Programmez vos interventions, gérez les créneaux et optimisez votre planning avec notre système intelligent."
              link="/features/planification-avancee"
            />
            
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-rose-600" />}
              title="Sécurité des données"
              description="Vos données sont protégées avec un système de permissions granulaires et un hébergement sécurisé."
              link="/features/securite-donnees"
            />
            
            <FeatureCard
              icon={<Wrench className="w-8 h-8 text-indigo-600" />}
              title="Suivi des interventions"
              description="Suivez le statut de chaque mission en temps réel, de la création à la facturation."
              link="/features/suivi-interventions"
            />
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Adapté à votre profil professionnel
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Chaque utilisateur dispose d'une interface personnalisée selon son rôle et ses besoins.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <UserTypeCard
              title="Administrateurs"
              subtitle="Gestionnaires & Dispatchers"
              features={[
                "Création et gestion des missions",
                "Attribution automatique ou manuelle",
                "Tableau de bord complet",
                "Gestion des utilisateurs et rôles",
                "Suivi financier et facturation"
              ]}
              color="blue"
            />
            
            <UserTypeCard
              title="Techniciens"
              subtitle="Équipes internes"
              features={[
                "Réception des offres de mission",
                "Géolocalisation en temps réel",
                "Planning personnel",
                "Rapports d'intervention",
                "Communication avec le dispatch"
              ]}
              color="emerald"
            />
            
            <UserTypeCard
              title="Sous-traitants"
              subtitle="Partenaires externes"
              features={[
                "Offres ciblées par zone géographique",
                "Acceptation/refus des missions",
                "Gestion du rayon d'intervention",
                "Suivi des rémunérations",
                "Interface simplifiée"
              ]}
              color="violet"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                Pourquoi choisir Nexus Clim ?
              </h2>
              <div className="space-y-6">
                <BenefitItem
                  icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
                  title="Gain de temps considérable"
                  description="Automatisez l'attribution des missions et réduisez les tâches administratives de 70%"
                />
                <BenefitItem
                  icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
                  title="Optimisation des coûts"
                  description="Réduisez les déplacements inutiles grâce à la géolocalisation intelligente"
                />
                <BenefitItem
                  icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
                  title="Satisfaction client améliorée"
                  description="Interventions plus rapides et suivi en temps réel pour vos clients"
                />
                <BenefitItem
                  icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
                  title="Évolutivité garantie"
                  description="Solution qui grandit avec votre entreprise, de 5 à 500+ techniciens"
                />
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-100 to-blue-100 rounded-3xl p-8 text-center shadow-2xl">
                <div className="text-7xl font-bold text-slate-800 mb-3">+40%</div>
                <div className="text-2xl font-semibold text-slate-700 mb-3">d'efficacité</div>
                <div className="text-slate-600 mb-6">en moyenne constatée</div>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white rounded-xl p-4 shadow-lg">
                    <div className="text-3xl font-bold text-emerald-600">-60%</div>
                    <div className="text-sm text-slate-600">temps de dispatch</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-lg">
                    <div className="text-3xl font-bold text-violet-600">+25%</div>
                    <div className="text-sm text-slate-600">missions/jour</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-slate-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Prêt à transformer votre activité ?
          </h2>
          <p className="text-xl text-slate-200 mb-10 max-w-3xl mx-auto">
            Rejoignez les professionnels qui ont déjà choisi Nexus Clim pour optimiser leurs interventions.
          </p>
          
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all transform hover:scale-105 shadow-2xl"
              >
                Démarrer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <Link
              to={profile?.role === "admin" ? "/admin" : profile?.role === "tech" ? "/tech" : "/offers"}
              className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all transform hover:scale-105 shadow-2xl"
            >
              Accéder à mon espace
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Nexus Clim</h3>
              </div>
              <p className="text-slate-400 mb-6 leading-relaxed">
                La solution digitale qui connecte et optimise vos interventions climatisation.
              </p>
              <div className="flex items-center gap-4 mb-4">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-sm text-slate-400 ml-2">Noté 5/5 par nos utilisateurs</span>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>01 23 45 67 89</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>contact@nexusclim.fr</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/features/gestion-equipe" className="hover:text-white transition-colors">Gestion des missions</Link></li>
                <li><Link to="/features/geolocalisation-intelligente" className="hover:text-white transition-colors">Géolocalisation</Link></li>
                <li><Link to="/features/planification-avancee" className="hover:text-white transition-colors">Planning intelligent</Link></li>
                <li><Link to="/features/suivi-interventions" className="hover:text-white transition-colors">Rapports d'activité</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Informations</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
                <li><Link to="/legal/politique-confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                <li><Link to="/legal/conditions-utilisation" className="hover:text-white transition-colors">Conditions d'utilisation</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-white transition-colors">Politique des cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p>&copy; 2024 Nexus Clim. Tous droits réservés.</p>
              <div className="flex gap-6 text-sm">
                <Link to="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
                <Link to="/legal/politique-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
                <Link to="/legal/conditions-utilisation" className="hover:text-white transition-colors">CGU</Link>
                <Link to="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, link }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
}) {
  const CardContent = () => (
    <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-slate-100 h-full group">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
      {link && (
        <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm font-medium group-hover:gap-3 transition-all">
          <span>En savoir plus</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  return (
    link ? (
      <Link to={link} className="block h-full">
        <CardContent />
      </Link>
    ) : (
      <CardContent />
    )
  );
}

function UserTypeCard({ title, subtitle, features, color }: {
  title: string;
  subtitle: string;
  features: string[];
  color: 'blue' | 'emerald' | 'violet';
}) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    emerald: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    violet: 'border-violet-200 bg-violet-50 hover:bg-violet-100'
  };

  return (
    <div className={`rounded-2xl p-8 border-2 ${colorClasses[color]} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 mb-6">{subtitle}</p>
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span className="text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenefitItem({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 group">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
}