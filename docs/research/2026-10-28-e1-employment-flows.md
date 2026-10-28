# E1.3 — Contrats et séniorité dans les parcours

Date : 28 octobre 2026. Branche : `feat/e1-employment-flows`, depuis master à jour
avec les commits E1.2 nécessaires conservés. Backend vérifié ; recette interface
et bilan final de la story en cours.

## Critères et réalisation

- Le recruteur peut choisir stage, alternance, CDI, CDD, mission indépendante et
  inconnu, ainsi que les deux catégories génériques historiques. La séniorité est
  une dimension indépendante. Les deux valeurs sont inconnues par défaut et ne
  sont pas déduites du titre ou du CV.
- La publication, les modifications et les duplications transportent ces champs
  jusqu’à Offer. Les droits de publication et de lecture restent limités au compte
  propriétaire et à sa vérification.
- Contrat et séniorité sont filtrés sur la valeur exacte, combinables, conservés
  dans l’URL, les filtres appliqués et les recherches enregistrées. La politique
  d’inconnus des autres critères ne les élargit pas.
- Les libellés partagés distinguent CDI et emploi salarié sans durée précisée.
  Les cartes, la fiche, l’aperçu recruteur et les préférences utilisent ces choix.
  Les anciennes URL restent compatibles.

## Schéma et conservation

La migration [0036](../../metier/app/jobboard/migrations/0036_recruiter_employment_dimensions.py)
étend les choix de RecruiterJob et ajoute une séniorité inconnue. Les anciens
contrats restent identiques. Des contraintes SQL protègent aussi les écritures
hors API. Le défaut SQL persistant permet à l’ancien modèle ORM de créer encore
une offre sans connaître la nouvelle colonne ; ce cas est testé sur PostgreSQL.

Un retour de schéma est refusé si les nouveaux contrats ou une séniorité connue
seraient perdus. Conserver le schéma additif pour un retour applicatif ; avant un
retour de schéma, arrêter les écritures, sauvegarder et réconcilier explicitement
les nouvelles données. Aucun reclassement automatique n’est exécuté.

Les publications créent une révision source avec contrat et séniorité déclarés.
Changer la séniorité actualise la projection. Une valeur inconnue conserve
l’empreinte sémantique historique, sans fabriquer un événement de modification.
Le test utilise une empreinte du format E1.2 comme référence de compatibilité.
Aucune donnée privée de candidature n’est ajoutée aux snapshots publics.

## Preuves

[Tests API, SQL et migration](../../metier/app/jobboard/tests/test_employment_flows.py) :
les premiers tests échouaient sur l’API précédente, notamment parce que le champ
seniority était refusé. Ils couvrent maintenant les huit contrats, les valeurs
inconnues, les filtres indépendants, les recherches enregistrées, les droits,
la duplication, les révisions et la migration aller/retour.

- **601 tests Django réussis en 184,616 s**, dont les 9 nouveaux tests de la story,
  sur PostgreSQL 16 isolé. La base de tests a été créée puis détruite.
- **27 tests ciblés de projection et de parcours réussis**, avec le contrôle
  d’empreinte historique ; la suite complète finale inclut ensuite ce contrôle.
- Lint et build frontend réussis ; avertissements existants Fast Refresh et bundle
  supérieur à 500 kB conservés. Ruff, contrôle Django, absence de migration
  manquante et `git diff --check` réussis.
- Bilan Playwright et recettes réelles : à compléter avant clôture de la story.

## Recette réelle des parcours

Après la préparation de la base fictive E1.2 décrite dans la
[recette du catalogue](2026-10-28-e1-it-catalogue.md#reproduire-la-recette-des-contrats),
appliquer les migrations sur cette base, puis lancer Django et Vite sur 8000/5173 :

```sh
uv run --project metier metier/app/manage.py migrate --noinput
RECETTE_PASSWORD='Intern-Demo-2026!' node tests/recette_parcours_emploi.mjs
```

Le script crée des offres fictives avec un préfixe distinct à chaque exécution,
via le formulaire recruteur réel, puis contrôle les filtres, badges, fiches et
droits côté candidat. Aucun mock API et aucune collecte externe.

La recette historique `recette_navigateur.mjs` exige un jeu `seed_dev` neuf,
avec une seule offre par recruteur. Après les créations de cette nouvelle
recette, utiliser une autre base fictive pour ce contrôle historique strict.
Ne pas modifier son assertion ni réinitialiser la base contenant les nouveaux
parcours. Les deux serveurs peuvent utiliser des ports distincts via
`RECETTE_URL` et `RECETTE_ADMIN_URL`.

## Limites et suite

Les textes de navigation encore orientés stage et la reprise historique restent
E1.4. Aucune collecte live, migration de production, CI distante ou mise en
production n’est annoncée. Aucun proxy ni nouvelle dépendance n’est requis.
