import { Link } from "react-router-dom";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Retour à l'accueil
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Informations légales</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Raison sociale :</strong> Nexus Clim SAS</p>
                <p><strong>Siège social :</strong> 123 Avenue de la Climatisation, 75001 Paris, France</p>
                <p><strong>Capital social :</strong> 50 000 €</p>
                <p><strong>RCS :</strong> Paris B 123 456 789</p>
                <p><strong>SIRET :</strong> 123 456 789 00012</p>
                <p><strong>Code APE :</strong> 6201Z (Programmation informatique)</p>
                <p><strong>TVA intracommunautaire :</strong> FR12 123456789</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Directeur de la publication</h2>
              <p>Le directeur de la publication est M. Jean Dupont, Président de Nexus Clim SAS.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Hébergement</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p><strong>Hébergeur :</strong> Supabase Inc.</p>
                <p><strong>Adresse :</strong> 970 Toa Payoh North #07-04, Singapore 318992</p>
                <p><strong>Site web :</strong> <a href="https://supabase.com" className='text-blue-600 hover:underline'>supabase.com</a></p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Support technique</h3>
                  <p>Email : support@nexusclim.fr</p>
                  <p>Téléphone : 01 23 45 67 89</p>
                  <p>Horaires : Lun-Ven 9h-18h</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Service commercial</h3>
                  <p>Email : contact@nexusclim.fr</p>
                  <p>Téléphone : 01 23 45 67 90</p>
                  <p>Horaires : Lun-Ven 9h-19h</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Propriété intellectuelle</h2>
              <p>
                L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur 
                et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour 
                les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
              <p className="mt-4">
                La reproduction de tout ou partie de ce site sur un support électronique quel qu'il soit est 
                formellement interdite sauf autorisation expresse du directeur de la publication.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Responsabilité</h2>
              <p>
                Les informations contenues sur ce site sont aussi précises que possible et le site remis à jour 
                à différentes périodes de l'année, mais peut toutefois contenir des inexactitudes ou des omissions.
              </p>
              <p className="mt-4">
                Si vous constatez une lacune, erreur ou ce qui parait être un dysfonctionnement, merci de bien 
                vouloir le signaler par email à l'adresse support@nexusclim.fr, en décrivant le problème de la 
                manière la plus précise possible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Liens hypertextes</h2>
              <p>
                Les liens hypertextes mis en place dans le cadre du présent site web en direction d'autres 
                ressources présentes sur le réseau Internet ne sauraient engager la responsabilité de Nexus Clim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Droit applicable</h2>
              <p>
                Tant le présent site que les modalités et conditions de son utilisation sont régis par le droit 
                français, quel que soit le lieu d'utilisation. En cas de contestation éventuelle, et après l'échec 
                de toute tentative de recherche d'une solution amiable, les tribunaux français seront seuls compétents 
                pour connaître de ce litige.
              </p>
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