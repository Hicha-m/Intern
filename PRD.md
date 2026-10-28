# PRD — Emploi informatique et analyse du marché

Version 2 · 28 octobre 2026 · Cadrage initial, fonctionnalités futures à implémenter.

Ordre de référence : **PRD → [architecture](ARCHITECTURE.md) → [roadmap](ROADMAP.md)**.
Ces documents définissent l’évolution du produit ; les guides existants décrivent son fonctionnement actuel.

## 1. Problème et objectif

Intern aide déjà à rechercher des stages et suivre les candidatures. Il doit devenir
une plateforme globale de l’emploi informatique : stages, alternances, premiers
emplois, postes confirmés et missions. La recherche et le suivi restent utiles,
auxquels s’ajoute une analyse vérifiable de ce que demandent les employeurs.

Question centrale : « Pour obtenir un premier emploi en cybersécurité dans cette
région, quelles compétences, expériences, formations et certifications reviennent
dans les annonces, et quels salaires sont effectivement publiés ? »

Le produit décrit le **corpus collecté**, avec ses limites de couverture. Il ne
prétend pas représenter tout le marché ni garantir l’obtention d’un emploi.

## 2. Utilisateurs et parcours

| Acteur | Besoin | Résultat attendu |
| --- | --- | --- |
| Candidat étudiant, junior ou confirmé | Chercher des opportunités et comprendre une spécialisation | Offres filtrées, panel du marché et exigences sourcées |
| Recruteur | Publier et suivre ses candidatures | Parcours actuels compatibles avec les nouveaux contrats |
| Administrateur | Superviser collecte et qualité, puis les proxys optionnels | État des sources, incidents, fraîcheur et couverture |

Parcours prioritaire : choisir métier/spécialisation, zone, période, contrat et
niveau ; lire le panel ; consulter les annonces justificatives ; poser une
question au RAG ; comparer les exigences avec les compétences renseignées
volontairement ; enregistrer des offres et suivre ses candidatures.

## 3. Périmètre et livraison progressive

- **Socle** : étendre le catalogue informatique, fiabiliser la collecte existante,
  normaliser et dédupliquer les annonces.
- **MVP analytique** : filtres, statistiques descriptives et conditions d’entrée
  pour une spécialisation, avec provenance et données manquantes visibles.
- **Après le MVP** : questions en langage naturel via RAG et comparaison explicable
  avec les compétences du candidat.
- **Optimisation secondaire** : ajouter les proxys après les fonctionnalités
  produit prioritaires, uniquement si des mesures montrent un gain de vitesse
  ou de disponibilité. Leur absence ne bloque aucune livraison fonctionnelle.

Hypothèse de démarrage : France, annonces françaises et anglaises ; conserver les
sources européennes existantes et mesurer leur couverture avant élargissement.
Ce pilote borne la recette initiale, pas le périmètre final. Les autres pays et
langues sont ajoutés avec leur propre validation.

Hors première livraison : refonte complète, nouvelle marque, tous les secteurs
professionnels, candidatures automatiques supplémentaires, estimation de salaires
absents et classement opaque des candidats.

## 4. Exigences fonctionnelles

| ID | Exigence | Critère d’acceptation |
| --- | --- | --- |
| F01 | Emploi informatique global | Stage, alternance, CDI, CDD, mission et contrat inconnu sont distingués ; séniorité et contrat restent indépendants ; les anciens parcours stage fonctionnent |
| F02 | Collecte fiable | Chaque exécution indique source, requête, durée, statut, volumes et erreur ; un échec ou résultat vide incertain ne clôture aucune offre |
| F03 | Réutilisation GitHub | Chaque composant retenu possède une fiche : licence, maintenance, version/commit, compatibilité, limites et résultat de benchmark ; aucun fork sans besoin démontré |
| F04 | Gestion optionnelle des proxys, après les fonctionnalités produit | Import automatique depuis fournisseurs/listes configurés, validation périodique, expiration, score par destination, rotation et quarantaine ; absence de proxy sain visible |
| F05 | Données explicables | Chaque fait extrait conserve annonce, extrait justificatif, date, version d’extraction et confiance ; un champ absent reste inconnu |
| F06 | Panel statistique | Filtres combinables par mots-clés, métier, spécialisation, zone, dates, contrat, séniorité et télétravail ; URL partageable des filtres sans données privées |
| F07 | Indicateurs | Volumes uniques, évolutions, compétences, technologies, diplômes, certifications, langues, expérience, salaires publiés et taux de renseignement |
| F08 | Conditions d’entrée | Pour un premier emploi : exigences obligatoires/souhaitées, années demandées et mentions junior/sans expérience ; contradictions et absence d’information visibles |
| F09 | RAG sourcé | Réponse fondée sur le même corpus filtré, avec liens et extraits ; chiffres issus des agrégats SQL ; abstention quand les preuves manquent |
| F10 | Écart de compétences | Comparaison volontaire entre compétences déclarées et exigences des annonces ; chaque écart renvoie à ses preuves ; aucun envoi du CV au modèle par défaut |

## 5. Règles de calcul

- Unité : offre canonique dédupliquée ; conserver les annonces sources et les
  republications pour audit. Une offre multi-métiers peut appartenir à plusieurs
  segments : leur somme n’est pas nécessairement le total global.
- Présenter pour chaque indicateur la période, les filtres, la taille du corpus,
  le dénominateur, la date de calcul et la part inconnue.
- Fréquence d’une compétence : nombre d’offres uniques la mentionnant / nombre
  d’offres uniques avec description exploitable dans le segment. Distinguer
  obligatoire, souhaitée et non qualifiée ; afficher la couverture d’extraction.
- Ne pas confondre niveau d’études, séniorité, années d’expérience et type de
  contrat. « Junior » n’implique pas automatiquement « sans expérience ».
- Salaires : conserver devise, période, bornes, brut/net, fixe/variable et texte
  original. Afficher séparément les populations comparables. Pas de conversion
  horaire vers annuel sans hypothèses documentées. Une médiane de milieux de
  fourchettes est étiquetée comme telle, jamais comme salaire réellement versé.
- Seuil initial proposé : masquer les résumés salariaux sous 20 observations
  comparables ; afficher effectif et insuffisance. Ce seuil ne garantit pas la
  représentativité. Aucun salaire manquant remplacé par zéro.
- Séparer flux de nouvelles annonces par période et stock d’offres actives.
  Une extension de sources est signalée sur les courbes ; une disparition de
  collecte ne constitue pas une baisse de demande.

## 6. Qualité et objectifs de recette

Ces nombres sont des **cibles initiales**, pas des résultats obtenus. Mesurer le
point de départ en E0 et conserver protocole, date, configuration et corpus.

| Mesure | Cible initiale |
| --- | --- |
| Provenance | 100 % des offres du panel reliées à une source et à une date de collecte |
| Fraîcheur | Au moins 90 % des offres actives du pilote revérifiées en moins de 48 h lorsque les sources sont disponibles ; incidents affichés |
| Extraction | Sur au moins 200 annonces annotées, stratifiées par source/langue/niveau : précision ≥ 90 % et rappel ≥ 80 % pour compétences et expérience ; publier aussi les scores par champ |
| Dédoublonnage | Précision ≥ 98 % sur au moins 100 paires annotées, en publiant aussi le rappel |
| Panel | p95 API ≤ 2 s sur 100 000 offres canoniques, 10 consultations simultanées ; machine, index et cache documentés |
| RAG | Sur 50 questions figées : ≥ 90 % de réponses étayées, 100 % des chiffres identiques au SQL, abstention sur tous les cas volontairement sans preuve |
| Régression | Parcours candidat/recruteur, droits et CV privés validés ; recette navigateur/API/base réelle distincte des mocks |

Un échec de cible ouvre une story corrective ou une révision motivée du périmètre ;
il ne transforme pas une mesure manquante en validation.

## 7. Contraintes et décisions à fermer

Le socle technique est fixé dans l’architecture. Le budget proxy/LLM, les sources
du pilote et le fournisseur/modèle LLM restent à sélectionner par comparaison
mesurée avant leur activation. Le budget proxy peut rester indéfini tant que
cette optimisation est désactivée. Ne pas engager de coût récurrent sans budget défini.

Les tâches réseau restent bornées en concurrence, durée et tentatives. Les proxys
proviennent de sources configurées ; ils ne garantissent ni disponibilité de
LinkedIn ni fiabilité des données. Les erreurs 429 déclenchent une temporisation ;
une source bloquée doit pouvoir être suspendue.

Les annonces sont des entrées non fiables. L’assistant ne suit aucune instruction
contenue dans leur texte. Les données privées des candidats restent isolées du
corpus analytique et de ses exports. Définir rétention et suppression des snapshots
et des preuves avant d’activer les nouvelles collectes.

## 8. Définition de terminé

Chaque story possède critères vérifiés, tests adaptés, preuve des résultats,
documentation à jour et commit ciblé. Un epic est terminé après recette de ses
critères et de ses dépendances, puis mise à jour de la roadmap.
