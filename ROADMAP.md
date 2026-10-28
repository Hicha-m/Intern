# Roadmap — Plateforme d’emploi informatique et analyse du marché

Version 2 · 28 octobre 2026.

Références : [PRD](PRD.md), puis [architecture](ARCHITECTURE.md).
Workflow : [AGENTS.md](AGENTS.md). Cette roadmap décrit le travail futur ; les
fonctionnalités du dépôt restent documentées dans [README.md](README.md).

## Organisation agile

Chaque epic est découpé ci-dessous en stories livrables. Avant de commencer une
story, préciser ses critères, sa branche et son protocole de test. Limiter le
travail en cours à une story par développeur. Faire des commits courts après
chaque changement cohérent vérifié, puis une PR par story. Une cadence initiale
de deux semaines peut servir à planifier les itérations et démonstrations ;
la charge et les dates seront estimées après l’audit E0.

États : à faire → en cours → en revue → terminé. Indiquer les blocages dans la
story concernée. Une case cochée signifie critères vérifiés et preuves liées,
pas seulement code écrit. La réception de ces documents ne vaut pas recette
technique du produit futur.

## Ordre et dépendances

Les identifiants d’epic restent stables ; l’ordre ci-dessous indique la priorité
réelle de livraison. Les proxys sont un plus pour accélérer ou améliorer la
collecte si le gain est mesuré, sans prérequis pour les fonctionnalités produit.

| Epic | Objectif | Dépendances | État |
| --- | --- | --- | --- |
| E0 | Cadrage, audit et mesures nécessaires à la prochaine story | Aucune | En cours : documents rédigés, audit de recette à faire |
| E1 | Catalogue de tous les emplois informatiques | Audit E0 ciblé sur le catalogue | À faire, priorité produit 1 |
| E2 | Fiabilité minimale de la collecte et transport des champs utiles | E1 | À faire, socle du panel |
| E4 | Données normalisées et exigences sourcées | Collecte et champs utiles E2 ; aucune dépendance à E3 | À faire, priorité produit 2 |
| E5 | Panel statistique et analyse du premier emploi | E4 | À faire, priorité produit 3 |
| E8 | Recette et mise en production de chaque livraison | E5 pour le MVP ; critères de la fonction activée ensuite | À faire à chaque livraison |
| E6 | RAG d’analyse du marché | E5 | À faire, priorité produit 4 |
| E7 | Comparaison des compétences du candidat | E5 ; E6 non requis pour une comparaison SQL | À faire, priorité produit 5 |
| E3 | Pool de proxys et rotation JobSpy/LinkedIn optionnels | E2 ; après les fonctionnalités produit prioritaires | Reporté, optimisation secondaire |

**MVP** : audit E0 utile au périmètre, E1, socle nécessaire E2, E4 et E5,
puis recette et mise en production E8. Les comparaisons de dépôts et extensions
de sources E2.1/E2.2 sont menées seulement si elles répondent à un blocage mesuré ;
elles ne retardent pas les fonctionnalités réalisables avec les adaptateurs existants.
E3 est exclu du MVP et ne bloque ni E4/E5, ni E6/E7, ni leur recette E8.
Une source indisponible réduit la couverture affichée ; les sources disponibles
permettent de livrer. Le RAG puis la comparaison sont livrés avec leur propre
recette E8 ; la comparaison peut avancer sans attendre le RAG.

## E0 — Fixer le produit, l’architecture et la référence de qualité

Résultat : une base de décision mesurée pour les prochaines itérations.

- [x] E0.1 — Rédiger les instructions essentielles, le PRD et l’architecture à partir du dépôt.
- [x] E0.2 — Décomposer le travail en epics et stories avec critères de fin.
- [ ] E0.3 — Inventorier sources actives, règles stage, tâches, schéma, données et tests ; mesurer les erreurs et volumes actuels sans relancer toute la collecte. [Audit ciblé E1](docs/research/2026-10-28-catalogue-audit.md) : schéma et restrictions recensés ; bilan de tests en cours, volumes et erreurs de production non mesurés.
- [ ] E0.4 — Constituer progressivement, avant la recette de chaque fonctionnalité concernée, les jeux annotés extraction, doublons et questions RAG du PRD ; conserver provenance, date et séparation calibration/évaluation.
- [ ] E0.5 — Confirmer pays/langues du pilote, sources, rétentions et plafonds de coût des fonctions à activer ; traduire les points ouverts en décisions documentées.

Acceptation : inventaire lié à ses fichiers, bilan de tests existants, mesures de
départ et décisions consignées. Les cibles non mesurées restent indiquées comme telles.
Tests : commandes du README selon environnement disponible et recette réelle
isolée ; noter séparément échecs, mocks et contrôles non exécutés.

## E1 — Passer du stage au catalogue informatique global

Résultat : rechercher des opportunités informatiques à tous les niveaux.

- [ ] E1.1 — Auditer et étendre les choix de contrats, séniorité, expérience, métiers et spécialisations ; migration additive des champs manquants.
- [ ] E1.2 — Retirer le filtre stage obligatoire du runner, des requêtes, des règles de qualité, de publication et de recherche ; conserver un filtre stage explicite.
- [ ] E1.3 — Adapter formulaires recruteur, API et filtres candidat à stage, alternance, CDI, CDD et mission, avec contrat inconnu explicite.
- [ ] E1.4 — Adapter libellés et navigation ; reprendre les données historiques sans inventer contrat ou séniorité.

Acceptation : fixtures de chaque contrat visibles via API et interface ; emploi
informatique confirmé conservé, annonce hors périmètre classée à part ; anciens
parcours stage et recruteur opérationnels. Contrat et séniorité filtrables séparément.
Tests : migrations et contraintes PostgreSQL, régressions qualité/recherche/droits,
Playwright et recette navigateur/API/base réelle sur anciens et nouveaux contrats.

## E2 — Fiabiliser la collecte et sélectionner les briques GitHub

Résultat : collecte reproductible et diagnostic précis des incidents.

- [ ] E2.1 — Comparer JobSpy amont, sa version épinglée, ses issues/forks et les dépôts candidats : licence, maintenance, fonctionnalités, qualité, contraintes et coût.
- [ ] E2.2 — Benchmarker les candidats sur des requêtes identiques ; retenir les composants utiles dans un ADR, épingler leurs versions et documenter les éventuels patchs.
- [ ] E2.3 — Uniformiser les états succès, vide confirmé, partiel et échec ; conserver curseur, provenance et diagnostics expurgés.
- [ ] E2.4 — Vérifier/compléter idempotence, réservation de tâches, reprise après crash, budgets de requêtes et temporisation par source.
- [ ] E2.5 — Remonter les rémunérations et champs disponibles de JobSpy jusqu’au modèle ; exposer le tableau de santé des sources à l’administrateur.

Acceptation : deux exécutions identiques ne créent pas de doublons ; reprise depuis
le dernier curseur validé ; aucune clôture d’offre après erreur/vide incertain ;
benchmark avant/après conservé et versions retenues justifiées.
Tests : contrats de connecteurs sur fixtures, timeout, 429, parsing cassé, pagination,
concurrence et crash contrôlés ; essai live limité avec rapport distinct.

## E4 — Structurer les données et les conditions d’entrée

Résultat : corpus dédupliqué, enrichi et auditable pour les statistiques.

- [ ] E4.1 — Normaliser métiers, spécialisations, synonymes de compétences, contrats, langues, télétravail et zones géographiques ; versionner la taxonomie.
- [ ] E4.2 — Extraire compétences obligatoires/souhaitées, diplôme, certifications, années d’expérience et séniorité avec extraits justificatifs.
- [ ] E4.3 — Normaliser les rémunérations sans mélanger devises, périodes, brut/net et fixe/variable ; garder les informations inconnues.
- [ ] E4.4 — Améliorer le rapprochement d’annonces multi-sources, l’historique, les republications et le cycle actif/expiré ; conserver les fusions explicables.
- [ ] E4.5 — Rejouer l’enrichissement de façon idempotente, appliquer la rétention et publier les métriques de qualité et de couverture par source.

Acceptation : chaque fait possède source, extrait et version ; valeurs absentes
préservées ; cibles d’extraction et dédoublonnage du PRD évaluées sur le jeu tenu
à part ; taux d’inconnus et erreurs publiés. Les échecs ouvrent des corrections.
Tests : corpus annoté FR/EN, synonymes, négations, expériences contradictoires,
bornes salariales, doublons, expiration, rejeu et migrations sur base isolée.

## E5 — Livrer le panel d’analyse du marché

Résultat : comprendre les exigences d’une spécialisation et d’un premier emploi.

- [ ] E5.1 — Implémenter les API SQL de synthèse, compétences, salaires, exigences d’entrée et tendances avec filtres communs.
- [ ] E5.2 — Construire les panels React : mots-clés, métier/spécialisation, localisation, contrat, expérience, formation, langues et télétravail.
- [ ] E5.3 — Ajouter le parcours « premier emploi » : comparer exigences obligatoires/souhaitées, annonces junior et années demandées, avec accès aux preuves.
- [ ] E5.4 — Afficher date du corpus, effectifs, dénominateurs, inconnus, couverture, seuils de salaire et ruptures de collecte ; gérer vide et panne.
- [ ] E5.5 — Benchmarker les requêtes sur le volume du PRD ; indexer puis préagréger seulement si nécessaire ; documenter calculs et limites.

Acceptation : mêmes filtres = mêmes effectifs dans cartes, graphiques et listes ;
chaque indicateur se reproduit en SQL ; le panel fonctionne sans LLM ; seuils,
salaires et tendances suivent le PRD ; cible de performance mesurée.
Tests : résultats attendus calculés sur corpus fixe, combinaisons de filtres,
doublons, données absentes et petits échantillons ; E2E, affichage mobile,
navigation clavier et recette avec API/base réelle.

## E6 — Ajouter un RAG sourcé

Résultat : poser des questions sur les exigences du marché et obtenir des réponses
justifiées à partir du corpus sélectionné.

- [ ] E6.1 — Benchmarker au moins deux modèles/fournisseurs et fixer budget, configuration et traitement des données dans un ADR.
- [ ] E6.2 — Segmenter et indexer les descriptions avec leurs références ; établir une baseline plein texte ; n’ajouter embeddings/pgvector que sur gain mesuré.
- [ ] E6.3 — Construire la récupération filtrée et les outils SQL typés pour les chiffres ; borner requêtes, contexte, durée et dépenses.
- [ ] E6.4 — Fournir citations, extraits, dates, abstention et protection contre les instructions présentes dans les annonces.
- [ ] E6.5 — Ajouter l’interface de questions depuis le panel et évaluer les 50 questions figées, dont absences de preuve et contradictions.

Acceptation : cibles RAG du PRD atteintes ; aucun chiffre incompatible avec SQL ;
citations résolubles dans le segment demandé ; indisponibilité du modèle gérée et
absence de fuite de données privées. Réponse insuffisante préférable à invention.
Tests : évaluation hors ligne et essai réel du modèle séparés, injections dans les
annonces, sources supprimées, mauvais filtres, absence de preuves, plafond de coût
et E2E avec consultation des citations.

## E7 — Comparer les compétences aux exigences du marché

Résultat : identifier les exigences à travailler pour une spécialisation choisie.
La comparaison repose sur les faits et agrégats E4/E5 et fonctionne sans RAG.

- [ ] E7.1 — Permettre la sélection volontaire de compétences déclarées et d’un segment de marché.
- [ ] E7.2 — Présenter compétences communes, exigences absentes du profil et priorités fondées sur leur fréquence ; distinguer obligatoire et souhaitée.
- [ ] E7.3 — Expliquer chaque suggestion par des annonces et la taille du corpus ; permettre correction des compétences et réinitialisation.

Acceptation : aucune compétence non déclarée inventée ; suggestions traçables,
inconnus visibles ; profil accessible au seul propriétaire ; aucune promesse
d’embauche ni transmission implicite du CV au fournisseur LLM.
Tests : profils incomplets, synonymes, changement de segment, droits entre comptes,
suppression des données et parcours E2E complet.

## E8 — Recette, mise en production et amélioration continue

Résultat : une livraison reproductible et observable, d’abord pour le MVP E5,
puis à chaque activation E6/E7.

- [ ] E8.1 — Mettre en place CI : tests Django/PostgreSQL, lint, build, Playwright et recette intégrée avec fixtures locales ; aucune dépendance aux sources externes pour le passage obligatoire.
- [ ] E8.2 — Répéter migration, sauvegarde/restauration et retour applicatif sur environnement isolé ; configurer secrets et activation progressive.
- [ ] E8.3 — Exécuter régression candidat/recruteur/admin et nouvelles fonctions, recette navigateur/API/base réelle, contrôles de performance et confidentialité.
- [ ] E8.4 — Déployer la cible Compose, vérifier la santé et l’observabilité, publier la version et ses limites ; garder la procédure VM distincte.
- [ ] E8.5 — Revoir périodiquement qualité, couverture, santé proxy si activé, coûts et retours utilisateurs ; alimenter le backlog de corrections mesurées.

Acceptation : contrôles requis réussis, preuves et limites liées, procédure de
retour vérifiée, données privées protégées ; métriques réelles visibles après
déploiement. Une CI préparée ne signifie pas une CI distante exécutée.

## E3 — Récupérer, tester et faire tourner les proxys (optionnel, en dernier)

Priorité : après les fonctionnalités produit E1/E4/E5/E6/E7. Activer cet epic
uniquement pour un gain mesuré de vitesse ou de disponibilité ; aucune autre
fonctionnalité ne dépend de son achèvement.

Résultat : gestion automatique du cycle de vie des proxys utilisée par JobSpy,
notamment pour LinkedIn, sans considérer la rotation comme une garantie de succès.

- [ ] E3.1 — Choisir les fournisseurs/listes configurables, y compris candidats GitHub évalués ; importer périodiquement, dédupliquer et protéger les secrets.
- [ ] E3.2 — Tester protocole, disponibilité, HTTPS, latence et validité par destination ; expirer les anciens contrôles et refuser les adresses réseau internes issues des listes externes.
- [ ] E3.3 — Implémenter score de santé, sélection, rotation, affinité de session, quarantaine et revalidation avec limites de concurrence.
- [ ] E3.4 — Brancher le pool sur les adaptateurs JobSpy réellement utilisés ; vérifier le support au commit épinglé avant de décider mise à jour ou fork.
- [ ] E3.5 — Ajouter supervision : capacité saine, rendement par source, causes d’échec, 429, coût et alertes ; différer les tâches sans proxy disponible.

Acceptation : un proxy défaillant est écarté puis revalidé ; un proxy sain pour une
destination ne l’est pas implicitement pour toutes ; reprise et rotation bornées ;
aucun secret dans les logs ; campagne LinkedIn comparée à la référence E0 avec
dates, taux de succès et limites. Une campagne bloquée reste un résultat documenté.
Tests : serveur proxy local, endpoints invalides/expirés, TLS invalide, 429,
quarantaine, épuisement du pool et transmission effective à JobSpy ; tests live séparés.

## Prochaine story

**E0.3 : audit et mesures de départ.** Produire un inventaire synthétique des
filtres stage, contrats, sources, points de passage des rémunérations et tests
existants, centré sur les prérequis d’E1. Enchaîner sur E1.1 ; l’audit du pool
proxy et l’évaluation RAG attendent leurs epics respectifs.
