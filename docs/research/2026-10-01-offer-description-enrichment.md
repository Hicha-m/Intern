# Intern — descriptions lisibles et extraction des informations de stage

Date : 1er octobre 2026. Statut : recherche et proposition à discuter ; aucune modification du produit.

## Recommandation

Combiner la lecture en deux niveaux de Simplify (résumé structuré / annonce complète) avec les métadonnées de stage visibles chez Tsenta. Conserver la nuance des exigences et une preuve pour chaque information. Un meilleur affichage nécessite de préserver la structure dès l'import ; la reconstruire seulement dans le navigateur arrive trop tard.

Voir [la recherche concurrentielle](2026-10-01-simplify-tsenta-job-descriptions.md) pour les observations et leurs limites. Les pipelines internes de Simplify et Tsenta ne sont pas publics dans les sources consultées. Le pipeline ci-dessous est notre proposition, pas une reconstruction confirmée du leur.

## Diagnostic du code actuel

Inspection du checkout et essais locaux, sans lecture de la base ni audit visuel de l'application :

- `frontend/src/pages/OfferDetail.tsx` conserve le texte comme nœuds React, reconnaît quelques titres et listes au moyen de règles et affiche déjà durée, début et langues dans le panneau de candidature. Il ne reçoit pas une vraie structure de sections.
- `jobboard/integrations/greenhouse_catalogue.py` utilise `_Text.handle_data()` puis joint les fragments avec des retours à la ligne ; les balises h2/h3/li/p n'ont plus de type. Les séparations sémantiques et les puces sont perdues.
- `jobboard/integrations/public_catalogue.py` privilégie `descriptionPlain` chez Ashby ; chez Lever, les objets `lists` sont aplatis avec leurs titres dans un texte unique.
- `jobboard/services/catalogue.py` conserve les payloads dans `SourceRevision`. Pour les révisions qui contiennent encore le HTML ou les listes ATS, on peut reconstruire la structure sans tout recollecter. Cette disponibilité dépend du connecteur et de la révision ; certains payloads sont déjà normalisés.
- `OfferEnrichment.facts` et `SourceRevision` fournissent déjà une base pour des valeurs dérivées, leurs extraits, la méthode, la version et la provenance.
- `jobboard/services/engine_quality.py` (`rules-8`) extrait des durées en semaines/mois, mais la date de début attend une formulation proche de `Start: YYYY-MM-DD`. Il ne projette pas encore toutes les exigences ni les rubriques métier.

Essais exécutés avec `extract_facts()` sur des phrases synthétiques :

| Phrase | Durée actuelle | Début actuel |
| --- | --- | --- |
| Durée: 6 mois. Début: 2027-05-01. | 6 mois | 2027-05-01 |
| Stage de 6 mois à partir de mai 2027. | 6 mois | absent |
| This is a 12-week internship starting June 2, 2027. | 12 semaines | absent |
| Minimum 3 months, ideally 6 months. Start date flexible. | absent | absent |
| Summer 2027 internship. Applications close February 15, 2027. | absent | absent |

Ces essais illustrent les limites lexicales ; ils ne mesurent pas la précision ou la couverture sur le catalogue réel.

## Affichage proposé

### Aperçu rapide

Titre, entreprise, lieu, modalités. Puis une fiche compacte : durée, début, fin si indiquée, rémunération et rythme. Deadline distincte. Publication et dernière vérification en secondaire, avec leur libellé exact.

Ne pas transformer une information absente en zéro ou en refus. Pour durée/début, afficher « Non précisé » si nécessaire ; ne pas remplir une grille de dix champs inconnus. Un conflit important affiche « À confirmer » et permet de voir les formulations.

### Lecture structurée

Deux vues locales : **L'essentiel** et **Annonce complète**. L'essentiel affiche :

1. À propos du poste : quelques phrases sur l'équipe, le produit et l'objectif du stage.
2. Missions : puces concrètes et lisibles.
3. Profil requis : compétences et expérience réellement exigées.
4. Un plus : compétences préférées, sans les convertir en obligations.
5. Conditions du stage : diplôme, statut étudiant, année de diplomation, convention, disponibilité, langues, autorisation de travail, sponsoring et restrictions géographiques explicites.
6. Avantages et processus de recrutement lorsqu'ils sont décrits.

Chaque rubrique n'apparaît que si son contenu est étayé. Les sections non classées restent disponibles dans l'annonce complète. Ne pas effacer les conditions ou exceptions pour raccourcir la page.

Conserver le titre d'origine d'une section et ajouter sa catégorie normalisée. Une phrase de condition peut être liée à plusieurs catégories sans dupliquer le texte dans toute la page. Éviter les accordéons pour les missions et exigences centrales ; réserver le repli aux preuves et informations secondaires.

### Origine accessible

Une action « Voir l'extrait » sur une valeur ouvre la phrase source. L'annonce complète garde l'ordre original des paragraphes et des listes. Traduction éventuelle clairement indiquée, texte original toujours accessible. Les badges de technologies servent au balayage visuel ; ils ne signifient pas que chaque technologie est obligatoire.

## Extraction proposée

### Priorité aux informations déjà structurées

Ne pas demander à un modèle de retrouver ce que l'ATS fournit explicitement :

- [Lever Postings API](https://github.com/lever/postings-api) expose HTML, texte et `lists` avec titre/contenu. On peut classer les listes puis garder leurs éléments et leur ordre.
- [Ashby Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api) expose `descriptionHtml`, `descriptionPlain` et `publishedAt` ; la documentation prévient que les données manquantes restent manquantes.
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) expose le contenu et des métadonnées ; la fiche détaillée documente `first_published`, `updated_at` et `application_deadline`. `updated_at` ne signifie pas première publication. Les données du formulaire ne sont pas la liste des qualifications du poste.
- [Schema.org JobPosting](https://schema.org/JobPosting) définit `jobStartDate`, `jobImmediateStart`, `jobDuration`, `datePosted`, `validThrough`, `responsibilities`, `qualifications`, `educationRequirements` et `skills`. Leur présence doit être contrôlée sur chaque annonce ; le standard ne garantit pas que les employeurs les renseignent. `validThrough` est une expiration et ne devient une deadline de candidature que si cette signification est corroborée.

Les champs doivent appartenir à l'annonce ciblée et être cohérents avec le texte visible. Un conflit entre source structurée et description ne se règle pas aveuglément par priorité technique.

### Préserver les blocs avant d'extraire

Parser le HTML ou les listes ATS en blocs typés : heading, paragraph, bullet_list, ordered_list, link, emphasis. Produire du texte indexable en parallèle. Rendre des composants React connus et des liens validés, sans exécuter le HTML employeur. Un intitulé court en gras peut être un titre même si aucune balise h2 n'existe.

Garder l'ordre, le titre source, les listes imbriquées, les plages de caractères et la révision. Versionner cette projection de mise en forme indépendamment des faits : le hash sémantique actuel ignore les changements de format et ne suffit donc pas pour invalider une structure de présentation.

### Règles puis extraction sémantique ciblée

Les règles reconnaissent les expressions fréquentes multilingues : mois nommés, plages de dates, durées, dates flexibles, saisons, début immédiat, minimum/maximum/idéale, prolongation. Elles traitent les négations et distinguent durée du stage et expérience demandée.

Un LLM peut classer les passages ambigus et extraire les champs encore manquants dans un schéma strict. Demander un résultat nul plutôt qu'une valeur probable ; conserver texte exact, identifiant de bloc et modalité. Ne pas utiliser sa confiance déclarée comme probabilité de vérité. Valider le JSON et la présence réelle des citations, puis vérifier les interprétations. Une citation correcte ne prouve pas à elle seule que l'interprétation est correcte.

Traiter le contenu employeur comme des données, jamais comme des instructions. L'extracteur n'a pas besoin d'outils ou de documents privés du candidat. Extraction à l'import / changement pertinent, en tâche de fond, avec cache par révision et version du schéma/modèle. Aucun appel LLM par affichage ou par candidat pour des faits communs à l'offre.

### Dates et durées sans fausse précision

| Source | Représentation recommandée |
| --- | --- |
| À partir de mai 2027 | mois `2027-05`, précision mois, début à partir de |
| Summer 2027 | saison et année ; aucune conversion automatique en 1er juin |
| Starting June 2, 2027 | date exacte `2027-06-02` |
| ASAP | début dès que possible ; aucune date fixe |
| Minimum 3 months, ideally 6 | minimum obligatoire 3 mois ; préférence 6 mois |
| 12-week internship | 12 semaines ; pas de conversion approximative en 3 mois |
| 02/03/2027 sans contexte fiable | ambigu : conserver la chaîne, ne pas choisir le format |
| Du 2 octobre au 25 mars | conserver les bornes ; calculer seulement avec années justifiées |

Séparer `posted_at`, `first_seen_at`, `last_verified_at`, `application_deadline`, `expires_at`, `start`, `end`. Les deadlines horaires conservent le fuseau source ; la conversion affichée doit être explicite. Les mois calendaires ne valent pas automatiquement 30 jours.

### Exigences : conserver la logique

Stocker la phrase et la catégorie (formation, compétence, langue, visa, disponibilité, document, etc.), la modalité (requis, préféré, facultatif, inconnu), et les alternatives. « Python ou Java » est une alternative, pas deux exigences cumulatives. « En cours de licence ou expérience équivalente » doit garder sa branche alternative. « English fluent, French a plus » produit une langue requise et une préférence distinctes.

Inscription étudiante et convention sont distinctes. Autorisation de travail et sponsoring aussi. L'absence d'information sur le sponsoring reste inconnue. Le matching ne transforme pas une projection ambiguë en motif de rejet. Les questions requises dans un formulaire de candidature constituent un autre objet métier : elles peuvent n'apparaître que dans l'ATS et ne sont pas toutes déductibles de la description.

## Proposition de données

Réutiliser `SourceRevision` et `OfferEnrichment` ; prévoir une projection versionnée du contenu. Ne pas décider une migration dans cette recherche.

```json
{
  "source_revision_id": 123,
  "schema_version": "offer-content-1",
  "sections": [{
    "kind": "responsibilities",
    "original_heading": "What you'll do",
    "block_ids": ["b3", "b4"]
  }],
  "start": {
    "value": "2027-05",
    "precision": "month",
    "relation": "from",
    "status": "explicit",
    "evidence": {"block_id": "b7", "text": "à partir de mai 2027"}
  },
  "duration": {
    "minimum": {"value": 3, "unit": "months", "modality": "required"},
    "preferred": {"value": 6, "unit": "months", "modality": "preferred"},
    "maximum": null,
    "evidence": {"block_id": "b8", "text": "Minimum 3 months, ideally 6 months"}
  },
  "requirements": [{
    "category": "technical_skill",
    "modality": "required",
    "operator": "any_of",
    "items": ["Python", "Java"],
    "evidence": {"block_id": "b9", "text": "Experience with Python or Java required"}
  }]
}
```

Cet exemple est fictif. Les données ont aussi besoin de la méthode, version de l'extracteur, horodatage, chemins ATS et conflits éventuels. Une synthèse générée est distincte des blocs de texte d'origine. Le contrat actuel `start_date` et les filtres attendent une date exacte : une projection à précision mois/saison nécessite une évolution coordonnée de l'API, du matching et des filtres.

## Ordre conseillé

1. Préserver les structures ATS/HTML et rendre une annonce complète lisible. Gain immédiat sans génération de résumé.
2. Améliorer début/durée/deadline et afficher une fiche de stage, preuves comprises.
3. Classer les sections et les exigences, puis ajouter une synthèse courte lorsque le corpus de validation est prêt.
4. Introduire le matching détaillé uniquement après validation des obligations, préférences, alternatives et inconnues.

## Validation proposée avant implémentation large

Annoter un lot représentatif, par exemple 100 offres : FR/EN/DE, plusieurs ATS, textes sans titres, dates absentes, préférences et contradictions. Mesurer précision et couverture par champ, erreur d'obligation, omissions de conditions et fidélité des citations. Comparer règles seules et approche hybride, avec coût et temps par annonce.

Cas essentiels : durée vs expérience, publication vs début, deadline avec fuseau, saison sans date, minimum vs idéal, langue source vs langue exigée, diplôme alternatif, sponsoring absent, plusieurs sources en conflit. Tester aussi le rendu mobile, le clavier, les textes très longs et l'accès à l'annonce complète. Aucun score de fiabilité n'est annoncé à ce stade.
