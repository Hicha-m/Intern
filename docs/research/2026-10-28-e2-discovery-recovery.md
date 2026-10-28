# E2.4a — Reprise des tentatives et contrôle du bail

Branche : `fix/discovery-recovery`, dépendante de E2.3b.

## Critères et réalisation

- Les six runners conservent leurs réservations avec verrou de ligne et exclusion
  des baux actifs. Une nouvelle réservation éligible clôt les anciennes tentatives
  `running` en `failed / lease_expired`, dans la transaction de réservation.
- Cette clôture signifie perte de propriété, sans déduire le résultat du réseau.
  Curseur initial conservé ; volumes reçus/importés inconnus, pas zéro inventé.
- Le nouveau worker repart du curseur durable. Une réponse tardive de l’ancien
  worker ne peut réécrire une tentative déjà terminale.
- Le bail est revérifié après ingestion, avant validation du curseur. Si le
  budget est dépassé, les lignes et la progression sont annulées ensemble ; la
  tentative échouée est conservée et la temporisation existante reste appliquée.
- Aucun renouvellement automatique des baux ou changement des budgets réseau.
  La récupération se fait lorsqu’un worker reprend une requête éligible, après
  expiration ; aucune clôture arbitraire à partir de l’âge du journal seul.

## Validation

Première passe : 80 tests Django réussis sur PostgreSQL isolé, en 8,290 secondes.
Validation finale : 98 tests réussis en 11,823 secondes, dont quatre régressions
de reprise exécutées sur chacun des six runners, plus les tests existants de
runtime, réconciliation, reprise et migration. Suite Django complète non relancée. Les sources réseau
sont simulées ; transactions et contraintes PostgreSQL réelles. Le scénario
`KeyboardInterrupt` simule la sortie brutale du runner après réservation : il ne
constitue pas une campagne de crash du processus OS ou de panne PostgreSQL.

Ruff et contrôle Django réussis ; aucune migration nécessaire. Aucun parcours UI
modifié, donc pas de build frontend, Playwright ou recette navigateur relancés.
Pas de collecte externe, migration de production, publication ou déploiement.

## Suite

La reprise des imports entreprise, les curseurs des six collecteurs et les
budgets existants disposent de tests de régression. E2.4 ne vaut pas audit exhaustif
de tous les workers ATS, de l’ordonnanceur de production ou de leur charge. Ces
contrôles restent ouverts ; ils n’imposent pas de développer un pool de proxys.
La prochaine fonctionnalité produit est le transport des rémunérations E2.5,
nécessaire aux statistiques sourcées E4/E5.
