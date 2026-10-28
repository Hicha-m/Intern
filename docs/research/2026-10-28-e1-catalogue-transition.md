# E1.4 — Navigation emploi et reprise historique

Branche : `feat/e1-catalogue-transition`, dépendante de E1.3. Pas de changement
sur `master`. Publication GitHub en attente d’autorisation.

## Critères d’acceptation

- Catalogue, fiches offre/entreprise, inscription et couverture présentent des
  emplois informatiques ; seuls les filtres et preuves propres au stage emploient
  encore ce terme. Les anciennes URL restent utilisables.
- Le signalement d’un contrat erroné reste disponible pour tous les contrats.
- Reprise locale par lots avec borne supérieure stable et curseur explicite après
  erreur ; les journaux ne reprennent pas le contenu des annonces.
- Aucun contrat/niveau inféré d’un titre pendant ce retraitement ; identifiants,
  candidatures, favoris, sources et preuves conservés ; rejeu idempotent.
- Tests PostgreSQL, Playwright et recette navigateur/API/base réelle distincts.

## Reprise historique

`re_enrich_catalogue` conserve son traitement transactionnel par offre et ses
lots limités à 1 000. `--through-id` fixe la borne supérieure du lot initial
pendant la reprise ; les annonces ajoutées ensuite sont traitées dans une autre
exécution. La borne et le dernier lot validé sont écrits et vidés vers le journal.
En cas d’erreur, le message indique le dernier identifiant validé et la commande
à reprendre, sans texte d’annonce ni détail d’exception. Une interruption brutale
au milieu d’un lot peut rejouer les premières offres de ce lot sans effet supplémentaire.

```sh
uv run --project metier metier/app/manage.py re_enrich_catalogue --limit 100
# Reprendre avec les IDs affichés par la commande :
uv run --project metier metier/app/manage.py re_enrich_catalogue \
  --after-id <dernier_id> --through-id <borne_initiale> --limit 100 --all
```

Le retraitement reconstruit taxonomie et projections avec les règles actuelles.
Il ne modifie pas les champs sources de l’offre, son cycle de vie, les URL, les
révisions sources, les favoris ni les dossiers. En particulier, un titre
« Senior Backend Engineer » avec niveau inconnu garde ce niveau inconnu ;
`employment` n’est pas transformé en CDI. Les preuves nouvelles renvoient aux
révisions retenues lorsqu’elles corroborent littéralement le fait extrait.

## Validation

- 22 tests Django ciblés réussis sur PostgreSQL isolé, dont quatre régressions
  reprise par lots, erreur avec curseur, borne stable et préservation des données.
- 32 scénarios Playwright réussis avec API contrôlée : catalogue, fiches offre et
  entreprise, navigation, signalement `wrong_contract`, clavier et mobile.
- 11 scénarios supplémentaires pagination/suggestions/taxonomie et 9 scénarios
  couverture/inscription réussis : 52 scénarios Playwright distincts au total.
- Régression complète : 605 tests Django réussis sur PostgreSQL isolé en
  221,731 secondes. Les 22 tests ciblés ci-dessus sont inclus dans ce total.
- Recette réelle : 6 contrôles de transition historique, 18 contrôles des parcours
  recruteur/candidat pour les huit contrats et 15 contrôles historiques sur une
  base fictive séparée, tous réussis. Aucun mock API dans ces trois scripts.
- Ruff, lint frontend, build, contrôles des tokens, `manage.py check`, absence de
  migration imprévue, syntaxe des scripts et `git diff --check` réussis.
  Les trois avertissements Fast Refresh existants et celui du bundle > 500 kB
  subsistent ; aucune performance de production n’est déduite de ces contrôles.

Les données de recette sont fictives. Les premiers essais ont révélé des attentes
obsolètes de titre et de sélecteur dans les scripts ; elles ont été adaptées aux
libellés actuels puis les parcours ont été rejoués. Deux lancements Django se sont
chevauchés sur une base de test ; la validation finale a été exécutée séparément.
La rétention/extraction des exigences et l’analyse du marché restent en E2/E4/E5.
La CI distante, la fusion des branches et le déploiement ne sont pas exécutés.

Aucune reprise de production ni collecte externe exécutée.
