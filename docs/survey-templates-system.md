# Système de Templates d'Enquêtes

## Vue d'ensemble

Le système de templates d'enquêtes permet de créer des questionnaires de satisfaction personnalisables et réutilisables.

## Architecture

### Base de données

**Tables principales :**

1. **survey_templates** - Modèles d'enquêtes
   - Types : installation, maintenance, urgency, commercial, custom
   - Flags : is_active, is_system

2. **survey_questions** - Questions des templates
   - Types de questions : rating_stars, rating_nps, text_short, text_long, choice_single, choice_multiple, yes_no
   - Ordre d'affichage configurable
   - Options pour choix multiples (JSON)

3. **survey_responses** - Réponses dynamiques
   - Stockage flexible par type de question
   - Liaison question → réponse

4. **satisfaction_surveys** - Enquêtes envoyées
   - Maintenant lié à un template via `template_id`

### Templates par défaut

Le système inclut 3 templates pré-configurés :

1. **Installation Premium** (7 questions)
   - Évaluation globale
   - Qualité installation
   - Propreté chantier
   - Explications techniques
   - Fonctionnement équipement
   - Commentaires
   - NPS

2. **Maintenance Express** (6 questions)
   - Satisfaction globale
   - Rapidité intervention
   - Efficacité technicien
   - Type intervention (choix)
   - Commentaires
   - NPS

3. **Commercial Devis** (5 questions)
   - Qualité accueil
   - Clarté explications
   - Pertinence solution
   - Devis accepté (oui/non)
   - Remarques

## Utilisation

### Pour Admin

**1. Gérer les templates**
- URL : `/admin/survey-templates`
- Créer, modifier, supprimer des templates
- Visualiser les statistiques d'usage

**2. Créer une enquête**
- URL : `/admin/surveys`
- Sélectionner un template
- Renseigner client (nom, email)
- Optionnel : lier à une mission
- Copier le lien généré

**3. Envoyer au client**
- Le lien est au format : `/survey?token=xxx`
- Envoi manuel par email
- Le client remplit le formulaire dynamique

### Pour SAL (Commercial)

- Peut créer des templates de type "commercial"
- Utile pour enquêtes avant-vente, devis, satisfaction commerciale
- Mêmes fonctionnalités que admin pour ses templates

### Pour le Client (Public)

- Reçoit un lien unique
- Formulaire s'adapte au template choisi
- Questions affichées par sections
- Validation des champs obligatoires
- Confirmation de soumission

## Types de questions disponibles

| Type | Description | Exemple |
|------|-------------|---------|
| `rating_stars` | Étoiles 1-5 | ⭐⭐⭐⭐⭐ |
| `rating_nps` | Score 0-10 | [0] [1] ... [10] |
| `text_short` | Texte court | Input simple |
| `text_long` | Texte long | Textarea |
| `yes_no` | Oui/Non | Boutons binaires |
| `choice_single` | Choix unique | Radio buttons |
| `choice_multiple` | Choix multiples | Checkboxes |

## Sécurité RLS

**Permissions :**

- **Admin** : CRUD complet sur tous les templates
- **SAL** : CRUD sur templates "commercial" uniquement
- **Tech** : Lecture seule
- **Public** : Lecture des questions via token (anon)

**Isolation des données :**

- Templates système (`is_system=true`) non supprimables
- Réponses isolées par enquête
- Logs d'envoi traçables

## Évolutions possibles

### Phase 2 - Campagnes
- Envoi groupé à plusieurs clients
- Relances automatiques
- Planification d'envois

### Phase 3 - Analytics
- Dashboard par template
- Comparaison inter-templates
- Export des résultats

### Phase 4 - Automatisation
- Envoi auto après mission terminée
- Intégration email (SMTP)
- Webhooks pour les réponses

## API / Fonctions

**Queries principales :**

```typescript
// Récupérer les templates actifs
supabase.from("survey_templates").select("*").eq("is_active", true)

// Récupérer les questions d'un template
supabase.from("survey_questions").select("*").eq("template_id", id).order("order_index")

// Sauvegarder les réponses
supabase.from("survey_responses").insert([...])

// Marquer enquête comme complétée
supabase.from("satisfaction_surveys").update({ status: "completed" }).eq("id", id)
```

## Navigation

- **Admin Home** → **Pilotage** → **Envoyer Enquêtes**
- **Envoyer Enquêtes** → **Gérer les Templates** (bouton en haut)
- **Templates** → **Créer Template** / **Modifier** / **Supprimer**

## Tests

**Scénario complet :**

1. Admin crée un nouveau template custom
2. Ajoute 5 questions variées (étoiles, texte, choix)
3. Va sur "Envoyer Enquêtes"
4. Crée une enquête en sélectionnant son template
5. Copie le lien `/survey?token=xxx`
6. Ouvre le lien en navigation privée
7. Remplit l'enquête
8. Vérifie la réponse dans AdminSatisfaction

## Compatibilité

- ✅ Mobile responsive
- ✅ Templates système pré-chargés
- ✅ Ancienne page SatisfactionSurvey remplacée
- ✅ Build réussi sans warnings critiques
