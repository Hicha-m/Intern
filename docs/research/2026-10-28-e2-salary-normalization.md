# E2.5b — Normalisation salariale et provenance

Branche : `feat/e2-salary-normalization`, dépendante du transport E2.5a.

## Critères et réalisation

- Les données structurées Indeed distinguent `baseSalary` de `estimated`.
  `published` signifie ici présent dans le champ déclaré par la plateforme ; il
  ne constitue pas une vérification indépendante de l’employeur.
- Une base valide prime sur l’estimation ; sa devise vient de `currencyCode`,
  jamais de la devise d’estimation ni du défaut USD de JobSpy.
- Bornes décimales finies, non négatives ou nulles individuellement ; inversion,
  dépassement de capacité et plus de deux décimales donnent un état invalide,
  sans arrondi ni réparation. Aucun remplacement des valeurs absentes par zéro.
- Périodes heure/jour/semaine/mois/an conservées sans annualisation. Devise ou
  période absente/inconnue interdit une fourchette comparable. Brut/net inconnu.
- Glassdoor et LinkedIn restent `unknown` pour la publication : leur transport
  actuel ne prouve pas assez la nature publiée/estimée et la période. Les valeurs
  et textes source restent dans les révisions. Pas de parsing libre du texte ici.
- La projection courante est stockée sur `OfferSource.salary_projection` avec
  statut, version, révision, chemin JSON et valeurs connues. `estimated`, `missing`,
  `unknown`, `invalid` restent visibles en base, distincts de `published`.
- Seules les observations publiées avec devise/période exploitables alimentent
  `CompensationBand`, modèle existant. La fourchette est reliée à la révision
  originale ; les contraintes SQL imposent la même source et une projection
  unique par source/extracteur. Ces bornes ne sont pas des salaires versés.
- Correction/retrait : remplacement ou suppression de la seule projection de
  cet extracteur ; anciennes révisions, autres sources et fourchettes manuelles
  restent conservées. Le rejeu identique conserve les identifiants.
- L’import et la synchronisation sont transactionnels. Le lien révision/source
  est vérifié aussi dans le service. Aucune nouvelle dépendance.

## Migration 0039

Champs additifs avec valeurs historiques vides, sans reclassification des anciens
salaires. Les défauts SQL préservent les insertions de l’ancien modèle. Une FK
composite protège `source_revision_id/source_id`. Retour applicatif possible avec
schéma conservé ; retour du schéma refusé si des projections ou liens seraient
perdus sans archivage/réconciliation explicites.

## Validation

Première passe : 44 tests Django réussis sur PostgreSQL isolé, dont normalisation,
correction/retrait/idempotence, anciennes révisions, unicité, migration aller/retour
et ancien writer. La régression complète finale ajoute le rejet SQL d’une révision issue
d’une autre source et la version transactionnelle finale du service : **635 tests
Django réussis en 221,090 secondes**, dont neuf tests de normalisation/migration.

Recette réelle : trois contrôles Chrome/API/PostgreSQL réussis sur une offre
fictive : montants horaires, devise/période/brut-net et affichage mobile. Le premier
essai mobile a révélé le débordement d’un nom d’entreprise long ; retour à la ligne
corrigé et test Playwright dédié ajouté. Pas de collecte externe.

Onze scénarios Playwright réussis en 41,1 secondes avec API contrôlée. Lint,
build frontend, tokens, Ruff, contrôle Django, absence de dérive des migrations
et `git diff --check` réussis. Les trois avertissements Fast Refresh existants
et celui du bundle > 500 kB subsistent ; aucune performance n’en est déduite.
La migration a été appliquée à la base de recette éphémère uniquement.
Aucune migration de production, CI distante, publication GitHub ou mise en
production exécutée.

## Reproduire la recette

Sur la base éphémère `intern_market_test` déjà préparée, avec les variables
PostgreSQL de recette et les comptes DEV fictifs :

```sh
metier/.venv/bin/python metier/app/manage.py migrate --noinput
export RECETTE_SALARY_MANIFEST=/tmp/intern-e25b-manifest.json
metier/.venv/bin/python metier/app/manage.py shell < tests/fixtures/salary_normalization.py
RECETTE_PASSWORD='Intern-Demo-2026!' node tests/recette_salaire.mjs
```

La fixture refuse une autre base et ajoute une entreprise fictive distincte.
Aucune source externe n’est contactée. La vérification de provenance par révision
est réalisée par la fixture et les tests PostgreSQL ; l’interface actuelle montre
les montants et la période, pas encore le chemin de preuve salarial. Cette
consultation et la couverture statistique restent à livrer avec les analyses.

## Suite

Étendre le rejeu contrôlé aux anciennes sources puis construire les faits et
exigences sourcés E4.1/E4.2 pour le panel. La supervision E2.5 reste ouverte ; les
autres sources salariales doivent être validées avant de les annoncer couvertes.
Les anciennes fourchettes sans version/révision ne deviennent pas implicitement
des observations statistiques sourcées.
