# E0.3 — Audit ciblé du catalogue informatique

Date : 28 octobre 2026. Référence inspectée : `b972322`.
Branche : `docs/catalogue-audit`, créée depuis `origin/master` à jour, puis
avancée sur les commits de cadrage nécessaires, encore non fusionnés dans master.

## Critères et périmètre

Identifier les champs réutilisables, les restrictions stage et les points de
collecte/import ; mesurer le bilan de tests avant E1. Ne lancer aucune collecte
externe et ne modifier aucune donnée de travail. La mesure des sources réellement
actives et des volumes de production reste à faire sur l’environnement concerné.

## Schéma et décisions E1.1

| Sujet | Constat et suite |
| --- | --- |
| Contrat | [Choix existants](../../metier/app/jobboard/models/choices.py) : `internship`, `apprenticeship`, `employment`, `contractor`, `temporary`, `unknown`. Ajouter `permanent` et `fixed_term` pour les CDI/CDD explicitement établis. Conserver `employment` et `temporary` sans en déduire une durée. `contractor` couvre les missions indépendantes. |
| Séniorité | [Offer](../../metier/app/jobboard/models/catalogue.py) possède `entry`, `mid`, `senior`, `lead`, `executive`, `unknown`, indépendants du contrat. Aucun besoin de table parallèle. |
| Expérience demandée | Absence de bornes dédiées sur Offer. Ajouter minimum/maximum en années décimales, nullables ; zéro signifie explicitement sans expérience, null signifie inconnu. Contrôler positivité et ordre en base. L’extraction et ses preuves relèvent d’E4. |
| Métier/spécialisation | [Taxonomie versionnée](../../metier/app/jobboard/data/job-taxonomy-v1.json) : 24 domaines et 229 spécialisations ; logiciel/IT 12, data/IA 11, cybersécurité 9. Réutiliser JobDomain/JobSubdomain et leurs preuves. La délimitation informatique du catalogue sera appliquée en E1.2. |
| Préférences | [PreferenceContract](../../metier/app/jobboard/models/profiles.py) utilise les choix partagés et une contrainte SQL : étendre aussi cette contrainte lors de la migration. |
| Recruteur | [RecruiterJob](../../metier/app/jobboard/models/recruiters.py) et [JobInput](../../metier/app/jobboard/api/recruiters.py) limités à trois contrats. Extension des formulaires et API en E1.3. Ne pas confondre le libellé frontend actuel « CDI » pour `employment` avec une preuve du contrat. |

Migration E1.1 additive : préserver identifiants, liens, contrats historiques et
valeurs inconnues ; ne pas remplir l’expérience à partir de la séniorité.
Vérifier montée de version et retour sur une base PostgreSQL isolée ; le retour
sur l’ancien schéma exige d’abord de ramener les nouveaux contrats à `unknown`,
sans les transformer en stages ou en CDI supposés.

## Restrictions à lever en E1.2

| Couche | Preuve et restriction |
| --- | --- |
| Requêtes JobSpy | [Runner](../../metier/app/jobboard/integrations/jobspy_runner.py) impose `JobType.INTERNSHIP` ; [seed_queries](../../metier/app/jobboard/services/jobspy_collection.py) réutilise les termes stage de chaque pays. |
| Normalisation JobSpy | [normalize_record](../../metier/app/jobboard/integrations/jobspy_catalogue.py) ne transporte que contrat stage/inconnu et élimine les classifications autres que stage confirmé en Europe. |
| Autres collecteurs | [EURES](../../metier/app/jobboard/integrations/eures_catalogue.py), [WTTJ](../../metier/app/jobboard/integrations/wttj_catalogue.py), [JobTech](../../metier/app/jobboard/integrations/jobtech_catalogue.py), [Bundesagentur](../../metier/app/jobboard/integrations/bundesagentur_catalogue.py), [NAV](../../metier/app/jobboard/integrations/nav_catalogue.py) ont des filtres de requête ou d’admission stage ; les adaptateurs ATS ont aussi leurs périmètres propres. Changer les marqueurs de périmètre des snapshots avant toute réconciliation des absences. |
| Publication | [published_offers](../../metier/app/jobboard/services/engine_quality.py) exige `enrichment.classification=confirmed` et `europe_status=in_scope`. Préserver contrôle recruteur, cycle ouvert, expiration et fraîcheur en séparant admissibilité informatique et preuve de stage. |
| Recherche | [filtered_offers](../../metier/app/jobboard/api/catalogue.py) applique les contrats partagés ; la séniorité n’est pas encore proposée comme filtre indépendant. |
| Interface | [Formulaire recruteur](../../frontend/src/pages/recruiter/Jobs.tsx) et écrans candidat restent orientés stage. E1.3/E1.4 doivent couvrir filtres, libellés et parcours réels. |

## Collecte et données fiables

[import_board](../../metier/app/jobboard/services/catalogue.py) accepte 19 familles :
Greenhouse, Ashby, Lever, SmartRecruiters, Personio, Recruitee, Teamtailor,
Workable, Workday, SuccessFactors, iCIMS, Taleo, Eightfold, JobSpy, EURES,
WTTJ, JobTech, Bundesagentur, NAV. Cette liste décrit le code, pas des sources
actives ou accessibles aujourd’hui.

[BoardSchedule et DiscoveryQuery](../../metier/app/jobboard/models/engine.py)
conservent baux, échecs et checkpoints ; le rapprochement des absences exige un
snapshot complet et plusieurs observations. Préserver ces mécanismes en E2.
SourceRevision, SourceObservation et OfferSource fournissent déjà historique,
hashs, dates et provenance ; vérifier leur couverture avant ajout de modèles.

Le runner JobSpy ne transmet aucun montant salarial ; son normaliseur ne peut
donc pas alimenter CompensationBand. Transport et normalisation restent E2.5/E4.3.
Le runner et les adaptateurs conservent la version JobSpy verrouillée ; aucun
travail sur les proxys n’est nécessaire pour commencer E1.

## Mesures et vérifications

- Décompte statique Python AST : 577 méthodes de test dans `jobboard/tests/test_*.py`.
- Dépendances Python installées depuis le lockfile ; aucune nouvelle dépendance.
- Base de recette dédiée : PostgreSQL 16, conteneur éphémère
  `intern-market-recette-postgres`, port `127.0.0.1:55432`, sans volume existant.
- Suite Django complète : en cours au moment de l’audit ; résultat à consigner
  avant clôture de l’audit ciblé.
- Ruff (E4/E7/E9/F/I), contrôle Django, lint frontend et build : réussis.
  Avertissements préexistants : trois exports React Fast Refresh dans
  EngineControls.tsx et bundle JS supérieur à 500 kB.
- Aucun corpus réel, volume métier, taux d’erreur actuel, essai de collecte live,
  parcours navigateur ou test de charge mesuré. Ces résultats ne sont pas inférés
  d’une base vide ou des fixtures.

Commande de référence, avec les variables de la base de recette exportées :

```sh
TEST_DATABASE_NAME=test_intern_market_baseline \
  metier/.venv/bin/python metier/app/manage.py test jobboard --noinput
```

## Suite

E1.1 : modèle et migration additive ; tests PostgreSQL des contrats, des bornes
et de la préservation des données. E1.2 : ouvrir la collecte/publication aux
emplois informatiques avec filtre stage explicite. E1.3 : exposer ces choix dans
les API/formulaires et vérifier les parcours navigateur/API/base réelle.
