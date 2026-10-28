# E2.3b — Historique des tentatives de découverte

Branche : `feat/e2-discovery-attempts`, dépendante de E2.3a.

## Critères et réalisation

- Six runners couverts : JobSpy, EURES, WTTJ, JobTech, Bundesagentur et NAV.
- Chaque réservation crée une tentative dans la transaction du bail, avant le
  réseau, y compris lorsqu’aucune entreprise ne sera importée. La requête
  configurée (source, pays, langue, domaine, terme) est figée dans la tentative.
- Début/fin, curseurs avant/après, lignes reçues et importées, résultat et code
  d’erreur sont conservés. Les compteurs sont propres à la tentative ; les lignes
  importées ne sont pas un nombre de nouvelles offres canoniques.
- Une progression valide clôt la tentative dans la même transaction que les
  imports et le curseur. Une erreur annule la progression et conserve le curseur
  initial ; les compteurs non observés restent nuls SQL, pas zéro inventé.
- Résultats : `success`, `empty_confirmed`, `empty_uncertain`, `partial`, `failed` ;
  `running` conserve une tentative interrompue avant son résultat. Pagination
  restante ou lignes invalides donnent `partial`. Le vide non confirmé JobSpy
  reste distinct de l’échec et n’est jamais une preuve d’absence.
- Pour NAV, le résultat décrit une lecture du flux, pas un snapshot de tout le
  marché. Les lignes reçues sont les enregistrements retournés par l’adaptateur,
  pas l’ensemble des événements éventuellement balayés.
- La migration 0038 est additive : aucun historique inventé, requêtes conservées.
  Le retour applicatif peut conserver la table. Le retour de schéma refuse
  d’effacer des tentatives existantes sans archivage/nettoyage explicites.
- Les diagnostics ne reprennent pas le texte des exceptions ; les codes sont
  filtrés. Aucun CV ou secret ajouté à l’historique.

## Validation

Première passe : 62 tests réussis sur PostgreSQL isolé. Validation finale :
77 tests réussis en 7,601 secondes, dont cinq nouveaux tests couvrant les six
runners, l’annulation de progression et la migration aller/retour protégée.
Ruff, contrôle Django, absence de dérive des migrations et `git diff --check`
réussis. La suite Django complète n’est pas relancée : validation ciblée des
runners et de la reprise. Le réseau source est simulé dans ces tests ; les
transactions et contraintes PostgreSQL sont réelles. Aucun parcours UI modifié ;
build frontend, Playwright et recette navigateur non relancés pour ce backend.
Aucune collecte externe, migration de production, CI distante ou publication.

## Limites et suite

La récupération des tentatives restées `running` après arrêt brutal, l’expiration
et le renouvellement des baux relèvent de E2.4. Ne pas annoncer ces tentatives
réussies ou échouées sans vérification. Les runners de recherche/découverte ATS
hors de ces six collecteurs restent à auditer pour la couverture globale F02.
Les nouvelles tables doivent être conservées lors d’un retour applicatif.
