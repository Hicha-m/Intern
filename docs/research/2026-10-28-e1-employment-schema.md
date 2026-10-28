# E1.1 — Dimensions du catalogue informatique

Date : 28 octobre 2026. Branche : `feat/e1-catalogue-schema`.
Prérequis : [audit ciblé E0.3](2026-10-28-catalogue-audit.md).

## Critères d’acceptation

- Stocker les contrats CDI (`permanent`), CDD (`fixed_term`), stage, alternance,
  mission indépendante (`contractor`) et inconnu, en gardant les anciennes
  catégories `employment` et `temporary` sans en inventer la durée.
- Conserver la séniorité et la taxonomie métier existantes, indépendantes du
  contrat ; ne déduire aucune expérience de « junior » ou « senior ».
- Stocker deux bornes d’expérience en années décimales : zéro est une donnée
  explicite, null est une absence de preuve ; accepter une borne ouverte et
  refuser en base les valeurs négatives ou une plage inversée.
- Préserver les offres, liens sources et préférences historiques lors de la
  migration ; accepter les nouveaux contrats dans les préférences SQL.
- Vérifier le retour de schéma sur données historiques et refuser un retour
  qui ferait perdre de nouvelles informations.

## Réalisation

[Choix de contrats](../../metier/app/jobboard/models/choices.py),
[modèle Offer](../../metier/app/jobboard/models/catalogue.py) et
[migration 0035](../../metier/app/jobboard/migrations/0035_employment_dimensions.py).
Les champs `experience_years_min` et `experience_years_max` sont nullables,
avec deux décimales. Aucun remplissage historique ni collecte n’est exécuté.
Les métiers/spécialisations existants sont réutilisés.

Le retour applicatif conserve le schéma additif. Un retour du schéma sur 0034
est refusé tant qu’une offre utilise les nouveaux contrats ou porte une borne
d’expérience, ou qu’une préférence utilise un nouveau contrat. Avant un retour
de schéma, arrêter les écritures, sauvegarder les données et décider explicitement
de leur réconciliation. La migration ne supprime ni ne requalifie ces faits
elle-même. Le test de retour utilise exclusivement des données fictives.

## Validation

[Tests du schéma et de la migration](../../metier/app/jobboard/tests/test_catalogue_employment_schema.py).
Avant modification, les nouveaux tests ont constaté les choix de contrat et les
champs d’expérience manquants. Les tests après modification couvrent aussi les
contraintes SQL, l’inconnu, zéro, les fractions d’année, les bornes ouvertes et
la préservation des identifiants et sources.

Commande, avec les variables du PostgreSQL éphémère de l’audit exportées :

```sh
TEST_DATABASE_NAME=test_intern_market_schema \
  metier/.venv/bin/python metier/app/manage.py test \
  jobboard.tests.test_catalogue_employment_schema \
  jobboard.tests.test_schema jobboard.tests.test_migrations \
  jobboard.tests.test_profiles_api jobboard.tests.test_catalogue_api \
  jobboard.tests.test_job_taxonomy jobboard.tests.test_recruiters --noinput
```

Résultat : **68 tests réussis en 130,026 s**, dont les 6 nouveaux tests de
schéma/migration, sur PostgreSQL 16 isolé. La base `test_intern_market_schema`
a été créée puis détruite. Les tests API utilisent le client de test Django ;
les connecteurs externes éventuels sont simulés.

Ruff E4/E7/E9/F/I, `manage.py check`, `makemigrations --check --dry-run` et
`git diff --check` réussis. Le lint et le build frontend de référence passent ;
le frontend n’est pas modifié dans cette story.

## Limites et suite

Le catalogue public et les collecteurs restent limités aux stages tant qu’E1.2
n’est pas livrée. Les formulaires, filtres de séniorité et nouveaux champs API
relèvent d’E1.3 ; Playwright et recette navigateur/API/PostgreSQL seront nécessaires
pour leurs parcours modifiés. Aucun test navigateur, collecte live, migration de
production, déploiement ou CI distante n’est annoncé ici.
