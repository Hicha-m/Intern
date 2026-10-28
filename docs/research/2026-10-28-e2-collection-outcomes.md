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

## Preuves

- Le test rouge a reproduit une source `closed` au lieu de `active` lorsque
  l’adaptateur annonçait un vide complet accompagné d’une erreur.
- Première régression ciblée : 44 tests réussis sur PostgreSQL isolé.
- Validation finale ciblée : 13 tests réussis, dont six nouveaux tests et la
  migration aller/retour, contrainte SQL, ancien writer et retour protégé.
- Ruff, `manage.py check`, absence de dérive des migrations et `git diff --check`
  réussis.
- Régression complète finale : 611 tests Django réussis sur PostgreSQL isolé en
  182,794 secondes. Premier passage : une ancienne assertion de diagnostic
  encore chargée avant sa correction a échoué ; elle a été rejouée isolément
  puis la suite complète a été relancée avec succès.
- Aucun changement de parcours navigateur : lint/build frontend et E2E ne sont
  pas relancés pour cette sous-story backend. Aucun essai de source externe,
  migration de production, CI distante ou déploiement effectué.

Commande finale (variables PostgreSQL de recette déjà configurées) :

```sh
TEST_DATABASE_NAME=test_intern_e23_verified \
  metier/.venv/bin/python metier/app/manage.py test jobboard --noinput
```

E2.3a est vérifiée et commitée localement. La publication des branches récentes
reste en attente de l’autorisation du dépôt GitHub. E2.3b ci-dessous reste ouverte.

## Suite E2.3b : tentatives de requêtes

L’audit des [requêtes](../../metier/app/jobboard/models/engine.py) montre un état
courant (`cursor`, `last_success_at`, `last_error_code`, `result_count`), mais pas
un historique de chaque tentative. Le
[runner JobSpy](../../metier/app/jobboard/services/jobspy_collection.py) ne crée
un import entreprise que si le groupe possède des lignes importables. Les
[requêtes EURES](../../metier/app/jobboard/services/eures_collection.py) mettent
également à jour leur état courant et renvoient un résumé en mémoire. Les autres
runners de découverte devront être vérifiés avant de généraliser ce constat.

Critères de la suite : enregistrer aussi une tentative vide ou échouée sans
entreprise importée ; distinguer fin confirmée, vide incertain, pagination encore
ouverte et erreur de parsing ; conserver les curseurs avant/après et les compteurs
par tentative ; valider la progression dans la transaction protégée par le bail.
Ne pas présenter `result_count` cumulé comme le nombre reçu pendant la tentative.
Les erreurs et reprises doivent conserver les lignes et l’historique existants.
