# E1.2 — Catalogue informatique pour tous les contrats

Date : 28 octobre 2026. Branche : `feat/e1-it-catalogue`, créée depuis master
à jour, puis avancée sur E1.1 dont elle dépend. État : critères vérifiés localement ; pas déployée.

## Critères et résultat fonctionnel

- Le contrat et la séniorité ne décident plus de l’admission d’un métier
  informatique. Les familles logiciel/IT, data/IA et cybersécurité utilisent la
  taxonomie existante ; les métiers hors informatique et les rôles ambigus
  restent distincts pour audit.
- JobSpy recherche tous les contrats par défaut ; son option stage explicite
  reste disponible. Les requêtes EURES, WTTJ, Bundesagentur, iCIMS, Taleo et
  LinkedIn public n’imposent plus le stage. Les requêtes métier sont ajoutées
  aux seeds de découverte ; les requêtes historiques sont conservées.
- Les détails Workday, Eightfold, SuccessFactors, Personio et Workable ne sont
  plus écartés du seul fait d’un intitulé hors stage. Les autres flux ATS qui
  transportaient déjà tous les contrats utilisent le même périmètre de publication.
- Les labels explicites CDI, CDD, alternance et mission sont conservés ; les
  conflits restent inconnus. « Full time » et « Part time » ne deviennent pas
  un CDI. Une preuve de stage peut établir le contrat sans devenir obligatoire.
- Listes, détails, matching, préflight ATS et diagnostics de couverture séparent
  métier informatique et classification stage. Le navigateur ne transmet plus
  automatiquement `classification=confirmed` sur toute recherche.

Le pilote reste européen. Le télétravail sans pays autorisé prouvé reste à
vérifier. La couverture complète des pays/langues et le rappel de la taxonomie
ne sont pas annoncés comme mesurés.

## Préservation des données

Les nouvelles règles sont versionnées (`rules-19-it-scope`, taxonomie `rules4`,
matching `rules-3-it-scope`). Les alias ajoutés portent sur des intitulés métier
explicites, notamment pentester, interfaces React et administration systèmes.
Les révisions sources sont conservées ; aucun cycle de vie n’est déduit du fait
qu’une annonce n’est pas un stage.

Les snapshots filtrés Workday/SmartRecruiters portent leur périmètre. Une première
collecte complète dans un nouveau périmètre remet à zéro les observations
historiques d’absence et ne clôture rien. Les collectes suivantes ne rapprochent
les absences que pour les métiers IT classés, avec les confirmations habituelles.
Les annonces historiques hors IT restent conservées. Les échecs, résultats partiels
et quarantaines gardent leurs protections existantes. Les checkpoints Eightfold
passent en version 2 pour éviter de réutiliser une position dans une autre liste
de requêtes.

Aucune migration de schéma ni dépendance ajoutée. Aucune collecte externe ou
modification d’un volume de travail. Les contrôles de fraîcheur, expiration et
révocation du recruteur restent actifs.

## Vérifications réalisées

- [Tests métier dédiés](../../metier/app/jobboard/tests/test_it_catalogue_scope.py) :
  six contrats, inconnu distinct, occupation hors IT, requête JobSpy réelle
  construite avec le SDK verrouillé mais adaptateur simulé, transition de
  périmètre et recommandations sans spécialisation secondaire. Ces dernières
  reproduisaient une erreur liée aux tableaux SQL nuls, corrigée dans l’API.
- Une première régression a révélé les assertions liées à l’ancien périmètre
  marketing/stage ainsi que des défauts d’intégration ; elles ont été corrigées
  en conservant les tests de localisation, erreurs, reprise et droits.
- Régression ciblée : **122 tests Django réussis en 32,627 s**, sur PostgreSQL 16
  isolé, dont les contrôles catalogue, sources, matching et droits concernés.
- Playwright : **36 tests réussis** sur les parcours catalogue, détail, entreprise,
  dashboard et recruteur avec API simulée. Après suppression du filtre imposé
  dans le navigateur, les **8 tests engine** ont de nouveau réussi en 46,3 s.
- [Recette existante](../../tests/recette_navigateur.mjs) : **15 contrôles réussis**
  dans Chrome avec Vite, Django et PostgreSQL réels ; comptes, candidatures et CV
  fictifs, y compris refus d’accès entre comptes et administration.
- [Recette des contrats](../../tests/recette_catalogue_emploi.mjs) : **8 contrôles
  réussis** avec les trois couches réelles : listes/filtres/détails pour les six
  contrats, refus de l’annonce non IT, puis ouverture d’un CDI par un candidat
  depuis le catalogue. Aucun `page.route` ni source d’offres live.
- Découverte/partition : **24 tests Django réussis en 3,654 s**, dont l’absence
  de filtre stage sur LinkedIn public et le maintien des mots-clés métier lors
  d’une partition.
- Suite Django complète finale : **592 tests réussis en 196,791 s**, sur
  PostgreSQL 16 isolé. La base de test a été créée puis détruite.
- Ruff E4/E7/E9/F/I, contrôle Django, absence de migration manquante, liens
  documentaires, syntaxe du script navigateur et `git diff --check` : réussis.
  Lint et build frontend réussis après correction de la recherche. Les trois
  avertissements React Fast Refresh existants et le bundle supérieur à 500 kB
  restent signalés ; aucune validation de performance n’en est déduite.

## Reproduire la recette des contrats

Utiliser un conteneur PostgreSQL éphémère distinct, nommé
`intern-market-recette-postgres`, avec base/utilisateur `intern_market_test`,
mot de passe fictif `market_local_test` et port `127.0.0.1:55432`. Exporter les
variables PostgreSQL correspondantes et un `PRIVATE_STORAGE_ROOT` temporaire.
Ne pas utiliser la base de développement. La fixture refuse toute autre base.

Après `migrate` et `seed_dev` sur cette base neuve, puis lancement de Django sur
8000 et Vite sur 5173 selon le [guide de recette](../../tests/README.md) :

```sh
uv run --project metier metier/app/manage.py re_enrich_catalogue --all
export RECETTE_CATALOGUE_MANIFEST=/tmp/intern-e1-catalogue-fixture.json
uv run --project metier metier/app/manage.py shell \
  -c "exec(open('tests/fixtures/catalogue_emploi.py').read())"
RECETTE_PASSWORD='Intern-Demo-2026!' node tests/recette_catalogue_emploi.mjs
```

La [fixture](../../tests/fixtures/catalogue_emploi.py) est idempotente et passe
par l’importeur du catalogue avec un snapshot partiel fictif, sans requête réseau.
Le manifeste temporaire contient uniquement les IDs et intitulés fictifs.

## Limites et suite

E1.3 doit compléter les formulaires recruteur, les filtres de contrat/séniorité et
leurs libellés. Les textes de navigation et certains badges restent orientés stage
jusqu’à E1.3/E1.4. Les montants, exigences et preuves détaillées restent E2/E4.
Aucune collecte live, mesure des volumes de production, évaluation d’extraction,
CI distante ou mise en production n’est annoncée. Les proxys ne sont pas requis.
