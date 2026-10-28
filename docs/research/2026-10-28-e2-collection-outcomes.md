# E2.3 — Résultats de collecte fiables

Branche : `feat/e2-collection-outcomes`, dépendante des stories E1 locales.

## E2.3a — Réconciliation et résultats des imports

Critères :

- Résultat explicite de chaque import : succès, vide confirmé, partiel ou échec ;
  les imports historiques restent inconnus faute de preuve suffisante.
- Une collecte contenant des erreurs ne prouve aucune absence, même si
  l’adaptateur l’annonce complète ; une quarantaine n’est pas un vide confirmé.
- Les diagnostics persistés sont bornés et n’incluent ni texte brut ni URL privée.
- Les curseurs existants sont conservés et validés avec les lignes importées.
- Régression PostgreSQL et migration additive vérifiées avant commit.

E2.3b reste nécessaire pour uniformiser les résultats des requêtes de découverte
(JobSpy et flux nationaux), y compris les requêtes vides sans import entreprise.
E2.3 n’est donc pas encore annoncée terminée. Aucun changement d’interface dans
E2.3a ; pas de collecte externe ni de déploiement.

## Réalisation

`ImportRun.outcome` est additif et contraint : `unknown`, `success`,
`empty_confirmed`, `partial`, `failed`. Le statut technique existant reste
compatible : une importation partielle de lignes peut avoir `status=succeeded`
et `outcome=partial`. `seen_count`, dates et board conservent volumes, durée et
provenance ; les curseurs continuent à être enregistrés dans la même transaction
que les lignes importées (Eightfold). Aucun nouveau worker ou adaptateur ajouté.

La migration 0037 ne réinterprète aucun historique : résultat `unknown`, même
pour un ancien import réussi. Son défaut SQL persistant accepte les insertions
de l’ancien modèle ORM pendant un retour applicatif. Le retour du schéma est
refusé si des résultats connus seraient perdus ; conserver le schéma additif ou
archiver et réconcilier explicitement les résultats avant cette opération.

Un diagnostic d’adaptateur interdit désormais la réconciliation des absences,
même avec `complete=True`. Le résultat partiel persiste les lignes valides et
n’incrémente aucun compteur d’absence. Un vide en quarantaine reste partiel ; un
vide complet sans erreurs et hors quarantaine est `empty_confirmed`. Ces états
ne modifient pas le délai de confirmation ni les protections de changement de
périmètre. Les diagnostics gardent jusqu’à 500 codes structurés (80 caractères),
sans texte, URL, requête ou identifiant externe arbitraire. Les codes invalides
sont remplacés par `invalid_diagnostic`. Les snapshots restent dans leur stockage
source existant et n’entrent pas dans ces diagnostics.

## Preuves en cours

- Le test rouge a reproduit une source `closed` au lieu de `active` lorsque
  l’adaptateur annonçait un vide complet accompagné d’une erreur.
- Première régression ciblée : 44 tests réussis sur PostgreSQL isolé.
- Validation finale ciblée : 13 tests réussis, dont six nouveaux tests et la
  migration aller/retour, contrainte SQL, ancien writer et retour protégé.
- Ruff, `manage.py check`, absence de dérive des migrations et `git diff --check`
  réussis. Régression complète en cours. Aucun essai live effectué.
