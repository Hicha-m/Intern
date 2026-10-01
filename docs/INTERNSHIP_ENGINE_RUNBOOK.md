# Exploiter le moteur de stages en local

Ce guide accompagne [la spec](INTERNSHIP_ENGINE_SPEC.md). Le bilan de vérification et les limites constatées sont consignés à la fin de cette spec. Une commande d'import lit des annonces publiques ; elle n'envoie aucune candidature.

## Préparer le schéma

Depuis la racine du dépôt, après sauvegarde de la base :

```bash
docker compose up -d db
uv run manage.py migrate
uv run manage.py check
```

Ne pas supprimer le volume PostgreSQL. Les migrations du moteur sont additives ; les IDs et dossiers existants sont conservés.

## Ajouter une source

`register_source` accepte une URL de board ATS connue et un nom d'entreprise. Sans `--enable`, elle reste candidate. L'activation exécute un import pilote et crée sa planification.

```bash
uv run manage.py register_source https://boards.greenhouse.io/stripe --company Stripe --enable
uv run manage.py register_source https://jobs.lever.co/spotify --company Spotify --enable
uv run manage.py register_source https://jobs.ashbyhq.com/joko --company Joko --enable
uv run manage.py register_source https://careers.smartrecruiters.com/BoschGroup --company "Bosch Group" --enable
```

Ces boards ont été identifiés via leurs pages publiques le 30 septembre 2026. Leur contenu évolue : les nombres d'annonces ne sont pas un contrat et un board peut n'offrir aucun stage à une date donnée. Greenhouse, Ashby et Lever conservent les annonces du board puis distinguent les stages et le périmètre européen dans leurs projections. SmartRecruiters parcourt tous les résumés, puis collecte les détails des candidats stages en Europe ; son périmètre de snapshot est versionné. Voir [le connecteur](SMARTRECRUITERS_CONNECTOR.md). Le catalogue public applique toujours la règle stage confirmé + Europe confirmée.

Le nom d'entreprise est une entrée opérateur, pas une identité déduite d'un logo. La commande ne découvre pas à elle seule toutes les entreprises européennes. L'ajout de boards ne configure pas de credentials d'envoi et n'active pas une candidature autonome.

## Collecter et actualiser

Une seule passe :

```bash
uv run manage.py run_catalogue_worker --once --limit 100
```

Processus permanent, à superviser :

```bash
uv run manage.py run_catalogue_worker --poll-interval 30 --limit 100
```

Le consommateur du catalogue est séparé de `run_worker`, consacré aux candidatures. Il traite les synchronisations arrivées à échéance, les liens privés en attente et les notifications internes. Les limites, erreurs et prochaines tentatives sont persistées ; relancer la commande ne doit pas recréer les mêmes offres.

`import_offers --board-id <id>` permet un import opérateur ciblé. Un import ne constitue jamais une preuve que tous les stages d'un pays ont été trouvés.

## Conservation des snapshots

```bash
uv run manage.py purge_source_snapshots --limit 1000
```

Cette maintenance expurge les payloads sources anciens selon la rétention du moteur. Les identifiants, empreintes et preuves extraites restent disponibles pour les rapprochements et l'audit. Les documents privés de candidature restent sous leur propre politique de conservation.

## Vérifier sans effet externe

```bash
TEST_DATABASE_NAME=test_intern_engine uv run manage.py test jobboard --noinput
uv run manage.py makemigrations --check --dry-run
docker compose config --quiet
```

La base de test doit être distincte de la base locale utilisée par l'application. Les tests de connecteurs utilisent des réponses contrôlées ; les résultats de pilotes réseau réels sont rapportés séparément. Aucun CV ni candidature réelle n'est envoyé pour tester la collecte.

## Arrêter et reprendre

Arrêter le processus `run_catalogue_worker` coupe les nouvelles collectes sans supprimer les données. Désactiver un `SourceBoard` coupe une source ; les baux périmés sont récupérés par le moteur. Les erreurs d'accès restent des erreurs, pas une preuve de fermeture d'offre.

Avant un rollback du code, arrêter le consommateur du catalogue et conserver les snapshots. Ne pas réinitialiser la base et ne pas effacer les dossiers existants. Le bilan de livraison précise les migrations effectivement appliquées.

## Découverte périodique de pages employeurs

Un opérateur autorise un domaine exact et une page de départ publique :

```sh
uv run python manage.py register_discovery_seed https://example.com/careers --allowed-host example.com --company "Example"
uv run python manage.py run_catalogue_worker --once
```

Le worker parcourt au maximum trois pages du même domaine par seed, une fois par
jour, et détecte les liens vers les boards Greenhouse, Ashby et Lever. Il conserve
ces sources en `SourceCandidate.status=candidate`. Elles ne sont jamais activées
par la découverte : utiliser ensuite `register_source URL_BOARD --company NOM
--enable` pour le test d'import et l'activation opérateur. Un lease empêche deux
workers de parcourir simultanément le même seed. Une erreur est historisée dans
le seed et ne supprime aucune source existante.

`SourceDiscoverySeed` permet de consulter le dernier succès, la prochaine
exécution et le code d'erreur ; mettre `enabled=False` suspend le domaine.
Le domaine exact autorisé peut aussi servir aux imports privés par URL : une
page contenant exactement un objet JSON-LD `JobPosting` est extraite en texte
simple (titre, entreprise, description), sans publication dans le catalogue.
Les autres domaines restent limités aux connecteurs ATS ou à la saisie manuelle.
Les informations absentes restent vides.

Les lectures HTTPS vérifient toutes les adresses DNS puis connectent une adresse
publique directement avec TLS/SNI pour le domaine original. Chaque redirection
est revalidée (maximum trois), les domaines externes, identifiants URL et ports
hors 443 sont refusés. Réponses limitées à 2 Mio ; temporisation réseau de huit
secondes et budget de lecture par cycle de 25 secondes. Le résolveur DNS système
reste soumis à ses propres temporisations. Aucun navigateur ou login n'est
utilisé ; un HTTP 403 est un échec, sans contournement.

Cette boucle découvre des boards à partir des entreprises configurées. Elle ne
constitue pas une recherche exhaustive du Web, n'explore pas les pages JS sans
liens HTML, et ne crée pas de faux résultats lorsque le registre est vide.

## Réextraire après une correction des règles

```bash
uv run manage.py re_enrich_catalogue --all
```

Cette commande recalcule les faits à partir des données déjà importées. Une correction de normalisation des lieux exige d’abord un réimport des boards concernés. Les données manquantes ne sont pas inventées. Le [registre vérifié](research/europe-source-seed.json) contient des sources opérateur à importer, pas une preuve de couverture exhaustive.

## Extension de couverture : découverte autonome et nouveaux ATS

Le registre accepte désormais Personio, Recruitee et Workday, en plus des quatre
connecteurs initiaux. Les pages publiques Workday sont traitées par employeur ;
il ne s'agit pas d'une API globale officielle ni d'un accès recruteur.

```bash
uv run manage.py register_source https://haebmau.jobs.personio.de --company haebmau --enable
uv run manage.py register_source https://fieldbuddy.recruitee.com --company FieldBuddy --enable
uv run manage.py register_source https://ag.wd3.myworkdayjobs.com/en-US/Airbus --company Airbus --enable
```

Personio lit le XML public activé par l'employeur et, pour les stages candidats,
les données JSON-LD de la fiche lorsque le flux ne contient pas de pays ou de
description suffisante. Recruitee utilise son JSON public avec repli XML lorsque
l'accès JSON est refusé. Workday découvre les identifiants de ses facettes pays,
puis pagine par pays européen pour éviter une troncature globale à 2 000 résultats.
Un pays ne se déduit pas de la nationalité de l'entreprise.

Initialiser les recherches réellement disponibles et autoriser les imports pilotes
bornés des nouveaux boards reconnus :

```bash
uv run manage.py configure_discovery --auto-activate
uv run manage.py run_discovery --once --limit 2 --resolve-limit 30 --activate --activation-limit 3
uv run manage.py run_discovery --status
```

Le jeu initial contient 16 requêtes : un flux transversal Arbeitnow et quinze
recherches JobSearch en Suède. Les autres pays sont couverts selon les boards
trouvés/importés, sans prétendre disposer d'un flux national pour chaque pays.
Les résultats bruts des flux restent des pistes de découverte, jamais des offres
publiées sans passage par le connecteur et le filtre stage + Europe.

`DiscoveryQuery` conserve curseur, total connu, troncature, date, erreur, cadence,
bail et activation automatique. `DiscoveryResult` conserve l'origine, l'URL,
les métadonnées et le statut de résolution. Les titres de stage sont prioritaires
dans la file ; les autres pistes restent disponibles pour découvrir les employeurs.
Les URLs de fournisseurs génériques et tableaux d'administration sont ignorées.
Un fournisseur reconnu mais non supporté reste visible comme tel dans le registre.

Le worker catalogue exécute aussi la découverte. Lancer une fois la configuration
ne démarre pas un processus permanent :

```bash
uv run manage.py run_catalogue_worker --poll-interval 30 --limit 2
```

Les imports pilotes restent bornés à trois activations par passage de découverte ;
les échecs reprennent après backoff. Le processus local doit rester lancé ; en
exploitation Docker, le service `catalogue-worker` joue ce rôle. Aucun secret de
candidature ni compte candidat n'est nécessaire pour ces lectures publiques.

## Snapshots partiels et diagnostics

`ImportRun.diagnostics` conserve les identifiants et motifs des fiches défaillantes.
Un import peut réussir avec `is_full_snapshot=False` et `error_code=partial_snapshot` :
ses annonces valides sont importées, aucune absence n'est déduite du lot, et une
fiche échouée ne reçoit pas une fausse date de dernière vérification. Les erreurs
globales qui empêchent de lire la liste restent des échecs.

Le cas Bosch `744000130841037` illustre ce comportement : la contradiction reste
en diagnostic, les autres stages valides peuvent entrer dans le catalogue. Ne pas
interpréter un snapshot partiel comme une couverture complète de l'employeur.

## Recherche publique LinkedIn facultative

```bash
uv run manage.py configure_discovery --linkedin --auto-activate
uv run manage.py run_discovery --provider linkedin_public --once --limit 2 --resolve-limit 2
```

Cette option ajoute 47 recherches pays/territoires au jeu initial de 16 requêtes.
Elle utilise l'interface de recherche publique observée, sans compte ; ce n'est
pas une API officielle stable. Chaque passage lit une page, conserve son curseur
et son état de troncature. À 150 pistes, la recherche générale programme treize
recherches par domaine, sans subdivision récursive ni rafale immédiate. Le parent
reste déclaré tronqué. Les villes et fenêtres temporelles ne sont pas encore
subdivisées automatiquement ; aucun total complet LinkedIn n'est annoncé.

Seuls les liens employeurs publiquement visibles sont utilisés. Un lien de
candidature nécessitant une connexion n'est pas contourné ; la piste reste
`needs_access` et n'entre pas dans le catalogue. Les réponses 403/429/999 entraînent
une erreur durable et une temporisation. Les processus déjà lancés doivent être
redémarrés pour charger un nouveau connecteur ; les données et curseurs restent en base.

Consulter [la preuve de lecture publique](research/2026-09-30-linkedin-public-discovery.md)
et [le contrôle réel des six premiers marchés](research/2026-09-30-linkedin-discovery-audit.json).

## Portails SuccessFactors RMK vérifiés

Voir `docs/EUROPE_COVERAGE_V2_SPEC.md`. Trois domaines explicitement inspectés sont
acceptés ; un domaine SuccessFactors quelconque n'est pas automatiquement supporté.

```bash
uv run python manage.py register_source https://careers.sap.com --company SAP --enable
uv run python manage.py register_source https://jobs.schaeffler.com --company Schaeffler --enable
uv run python manage.py register_source https://jobs.zf.com --company 'ZF Group' --enable
```

Les URLs de fiches de ces domaines sont reconnues par le résolveur de découverte.
La collecte fait quatre recherches multilingues, au maximum quatre pages par
recherche, 240 identifiants, 80 Mio et 600 secondes par passage. Les titres de
résultats connus sans signal de stage sont ignorés avant chargement du détail ;
les titres absents restent inspectables. La publication vérifie ensuite le texte
et le pays de la fiche. Cette sélection réduit le coût mais peut manquer une
annonce dont le titre n'indique pas le stage : couverture partielle explicite.

`keyword_search_partial` est un diagnostic attendu : aucun passage de ce connecteur
n'autorise la fermeture d'annonces par absence. `page_budget_exceeded`,
`detail_budget_exceeded` et les erreurs réseau figurent dans `ImportRun.diagnostics`.
Sans aucun résultat conservable, une erreur réseau fait échouer le run ; l'import
pilote est alors suspendu, conformément à `register_source`.

Le worker de collecte doit tourner avec le code actualisé. Aucun worker de
soumission de candidature n'est nécessaire pour ces imports.

## Portails iCIMS et Taleo vérifiés

Voir [la spec V3](EUROPE_COVERAGE_V3_SPEC.md) et
[l'audit réel](research/2026-09-30-icims-taleo-coverage-audit.json).

```bash
uv run python manage.py register_source https://iaea.taleo.net/careersection/ex/jobsearch.ftl --company IAEA --enable
uv run python manage.py register_source https://internships-adlittle.icims.com/jobs/search --company 'Arthur D. Little' --enable
uv run python manage.py register_source https://emeacareers-trinseo.icims.com/jobs/search --company Trinseo --enable
uv run python manage.py register_source https://careers-hines.icims.com/jobs/search --company Hines --enable
uv run python manage.py register_source https://global-sas.icims.com/jobs/search --company SAS --enable
```

Ces hôtes sont explicitement autorisés ; les autres tenants restent candidats non
supportés. La recherche Taleo est un POST public en lecture seule. Les fiches
Taleo sont décodées depuis le champ public `initialHistory`, selon son schéma
`_hlid`, sans exécution JavaScript. L'identifiant et le numéro de concours doivent
correspondre à la recherche. Un changement de schéma produit un diagnostic.

Snapshots toujours partiels : jamais de fermeture par absence. Les sources sans
résultats éligibles peuvent rester planifiées, sans garantir qu'elles n'ont aucun
stage. Redémarrer le worker pour charger une nouvelle version du code.

## JobSpy : import direct et worker indépendant

La dépendance MIT est épinglée via `uv.lock` et `[tool.uv.sources]` sur le commit
`7f0ff3ab25a4a4cd204af421cf6378ede3da5569`. `uv sync --frozen` installe cette version,
pas l'ancienne distribution PyPI. Le build Docker dispose de git pour ce téléchargement.

```bash
# Créer les recherches et exécuter trois passages bornés.
uv run python manage.py run_jobspy_worker --seed-countries FR GB DE --sites linkedin --once --limit 3
# Poursuivre les curseurs et revérifier périodiquement.
uv run python manage.py run_jobspy_worker --poll-interval 30 --limit 1
# Alternative Docker, après build et disponibilité PostgreSQL.
docker compose --profile app up -d --build jobspy-worker
```

Ne pas lancer simultanément deux stratégies d'exploitation volontairement ; les
leases évitent toutefois que deux workers prennent la même requête. En panne de
base, le worker continu attend puis réessaie ; `--once` échoue explicitement.
Les recherches `jobspy_*` sont exclues du résolveur de boards. Les boards
`provider=jobspy` sont alimentés uniquement par ces recherches, pas par board.sync.

`jobspy_empty_unconfirmed`, `jobspy_timeout` et `jobspy_failed` sont des échecs,
jamais des snapshots vides complets. Indeed FR a échoué au pilote ; ne pas déclarer
cette source opérationnelle. Glassdoor n'a pas encore été testé. Les résultats
incertains restent dans DiscoveryResult, les offres admises utilisent l'importeur
commun et le filtre public stage + Europe.

## Inventaires ats-scrapers

Révision MIT conservée avec l'URL d'origine et l'empreinte SHA-256 dans chaque
DiscoveryResult. Ces inventaires fournissent des pistes mondiales à valider.

```bash
# Enregistrer des candidats, sans démarrer leur collecte.
uv run python manage.py import_ats_registry --limit 1000 --offset 0
# Reprendre le lot suivant (ordre déterministe à révision fixe).
uv run python manage.py import_ats_registry --limit 1000 --offset 1000
# Pilotes sur des noms exacts ; ne pas sélectionner Apple Roofing pour Apple.
uv run python manage.py import_ats_registry --providers workday --company-pattern '^(Philips|Red Hat|Orange|Thales)$' --limit 10 --activate-limit 4
```

La première page par défaut provient de Greenhouse ; `--providers` permet de cibler
les autres familles. L'offset compte les entrées valides correspondant au filtre :
conserver les mêmes providers et filtre à la reprise. Les erreurs de pilote
consomment le budget réseau et laissent une trace ; aucun candidat n'est assimilé
à une offre publiée. Voir [la spec V4](EUROPE_COVERAGE_V4_SPEC.md).

### Extension V5 : Teamtailor et Workable

Les deux fournisseurs sont reconnus par `register_source`, `import_ats_registry`
et le worker de catalogue. Utiliser `--providers teamtailor workable` pour cibler
leurs inventaires ; limiter les activations et vérifier l'identité des employeurs.
Workable lit séquentiellement les détails, sans suivre les redirections ; un
blocage est une erreur, pas une liste d'offres disparues. Les deux collectes sont
partielles : la fraîcheur masque les offres non revérifiées sans fermeture par
absence. Voir `EUROPE_COVERAGE_V5_SPEC.md` pour les limites et la recette.

### Extension V6 : EURES

Commande : `uv run python manage.py run_eures_worker --poll-interval 30 --limit 1`.
Initialisation : `--seed-countries DE BE FI` ; un pays déjà configuré conserve son
curseur et son activation. Inspection ciblée : `--once --query-id ID` respecte le
prochain passage planifié, ne force pas un lease. Service Compose `eures-worker`
dans le profil app. Les offres EURES ne sont jamais collectées par board.sync.

Le code contrat EURES est insuffisant pour publier : conserver la confirmation
textuelle supplémentaire. Les échecs de détails empêchent d'avancer la page ; les
fiches invalides/404 sont tracées et les anciennes copies cessent d'être visibles.
Les doublons entre plateformes sans URL commune ne sont pas automatiquement fusionnés.

### Extension V7 : Welcome to the Jungle

Worker local : `uv run python manage.py run_wttj_worker --poll-interval 30 --limit 1`.
Initialisation ciblée : `--seed-countries FR BE DE ES NL`. Service Compose
`wttj-worker` dans le profil app. Le curseur contient les bornes temporelles et la
page ; ne pas le remplacer par un simple numéro. Le découpage par date peut
réussir sans importer de ligne lors du premier passage : la fenêtre réduite est
alors enregistrée pour le suivant. `wttj_partition_saturated` nécessite une autre
partition, jamais la suppression silencieuse d'annonces. Les descriptions sont
des résumés source, signalés comme tels dans la fiche.

### Extension V8 : Eightfold PCSX

Passer les portails inspectés à register_source : nvidia.eightfold.ai/careers,
dolby.eightfold.ai/careers, apply.careers.microsoft.com/careers. Utiliser HTTPS.
Le worker catalogue les collecte ; aucun worker Eightfold séparé.
Microsoft est suspendu après un HTTP 429 lors du pilote. Attendre la fin de la
limitation avant une réactivation explicite. Le refus PCSX de Bayer ne déclenche
pas de tentative authentifiée ni de contournement.

## V9 — JobTech / Suède

Initialisation et pilote :

```sh
uv run python manage.py run_jobtech_worker --seed-countries SE --once --limit 4
```

Collecte continue :

```sh
uv run python -u manage.py run_jobtech_worker --poll-interval 30 --limit 1
```

Le worker local est actif ; log `/tmp/intern-jobtech-worker.log`. Le service
Compose `jobtech-worker` est configuré sous le profil `app`, sans build d’image
vérifié dans ce lot. Quatre termes, pages de 20, fréquence cinq minutes entre
pages et douze heures entre cycles. Inspecter les `DiscoveryQuery` du provider
`jobtech` : `cursor`, `total_available`, `truncated`, `last_error_code`,
`last_success_at`. Le provider `jobsearch_se` reste de la découverte uniquement.

Pilote audité : 76 résultats et 24 offres JobTech publiables ; les recherches se
recouvrent et ne constituent pas des ajouts uniques tous fournisseurs confondus.
Rapport : `docs/research/2026-10-01-jobtech-results.json`.
Sauvegarde avant import :
`~/.codex/backups/intern-coverage-v9-20261001/before-jobtech.dump`.
Désactiver les requêtes `jobtech` pour suspendre la collecte ; désactiver ses
SourceBoard pour retirer les offres de cette source. Ne pas utiliser le worker
de soumission de candidatures pour cette collecte.

## V10 — Bundesagentur / Allemagne

```sh
uv run python manage.py run_bundesagentur_worker --seed-countries DE --once --limit 3
uv run python -u manage.py run_bundesagentur_worker --poll-interval 30 --limit 1
```

Worker local activé, log `/tmp/intern-bundesagentur-worker.log`. Service Compose
`bundesagentur-worker` disponible sous profil `app`, image non reconstruite ici.
Trois requêtes `Praktikum`, `Praktikant`, `Internship` ; 20 détails/page, prochaine
page après une minute, nouveau cycle après douze heures. Inspecter les
`DiscoveryQuery(provider="bundesagentur")` pour suivre les curseurs, erreurs,
leases et compteurs. Le plafond local de 500 pages est signalé par `truncated`.
Une recherche interrompue reprend la même page ; respecter le délai de reprise.

Pilote : 49 fiches publiables sur 60 résultats, 11 incertains, 346 tests backend.
Rapport : `docs/research/2026-10-01-bundesagentur-results.json`.
Sauvegarde : `~/.codex/backups/intern-coverage-v10-20261001/before-bundesagentur.dump`.
Désactiver les requêtes pour suspendre la collecte ; désactiver les SourceBoard
Bundesagentur pour retirer cette source de la publication. L’absence dans une
page partielle ne vaut pas suppression. HTTP 404 du détail invalide la copie
existante ; sans date de fin explicite, le contrôle commun de fraîcheur s’applique.

## Lot 18 — Audit de couverture

Ouvrir `/engine` (navigation « Moteur »). Les compteurs utilisent la frontière
réelle de publication ; pays et sources se recouvrent. Une page restante ou un
cycle terminé ne mesure pas la part du marché européen collectée.

```sh
uv run python manage.py audit_coverage
uv run python manage.py reconcile_offer_duplicates --links
uv run python manage.py reconcile_offer_duplicates --merge ID
uv run python manage.py reconcile_offer_duplicates --reverse ID
```

Inspecter les preuves de chaque `OfferMergeDecision` avant `--merge`. La commande
`--links` ne fusionne rien. Une offre avec histoire de candidature liée reste
protégée. Rapport local initial : `docs/research/2026-10-01-coverage-audit.json`.
Aucune fusion n’a été nécessairement prouvée lors de ce scan ; zéro fusion réalisée.

Les recherches Bundesagentur 184 et 185 ont repris après correction du format
de référence (point autorisé). Les pages 4 et 2 ont été traitées avec succès et
les curseurs ont avancé à 5 et 3. Les erreurs de débit LinkedIn et les plafonds
LinkedIn/JobSpy ne sont pas corrigés par une remise à zéro du curseur. Respecter
les reprises existantes ; les sources suspendues restent suspendues.

## Lot 19 — Diagnostics de reprise

- WTTJ : le slug d’entreprise peut contenir un point ; la recherche FR 133 a repris
  de la page 9 à 10 sans remise à zéro de sa partition.
- SmartRecruiters : `snapshot_changed` et `duplicate_job` dans les diagnostics
  rendent le snapshot partiel. Les absences ne ferment pas d’offres. Les erreurs
  réseau gardent leur backoff ; ne pas qualifier un timeout de catalogue vide.
- Indeed : `jobspy_upstream_http_error`, `jobspy_rate_limited` et
  `jobspy_upstream_invalid_response` distinguent les échecs. Seul un résultat vide
  prouvé termine le cycle. Les curseurs sont conservés sur erreur.
- LinkedIn : un 429 reporte toutes les recherches publiques du provider, au moins
  une heure. Les échéances plus tardives sont préservées. Ne pas forcer le polling.

Sauvegarde avant reprise :
`~/.codex/backups/intern-coverage-v12-20261001/before-recovery.dump`.
Rapport : `docs/research/2026-10-01-collection-recovery.json`.

## Lot 20 — NAV / Arbeidsplassen

```sh
uv run python manage.py run_nav_worker --seed-countries NO --once
uv run python -u manage.py run_nav_worker --poll-interval 10 --limit 1
```

Log local : `/tmp/intern-nav-worker.log`. Service Compose `nav-worker` sous profil
`app`. Sans `NAV_FEED_TOKEN`, usage du jeton public d’expérimentation. Ne pas copier
le jeton dans les rapports. Pour un accès pérenne, suivre l’inscription consommateur
NAV ; aucun email n’a été envoyé dans ce lot.

La requête principale conserve sa date initiale (184 jours avant configuration).
Le curseur est `uuid:offset`, préfixé `tail:` à la fin du flux ; ne pas le remettre
à zéro lors d’un échec. La page Moteur affiche alors « en veille sur le flux ».
Le pilote de septembre a sa propre requête désactivée après import ; il ne
remplace pas le rattrapage principal. Rapport : `docs/research/2026-10-01-nav-results.json`.
Pilote : 1000 événements, 1 stage publiable. Les erreurs d’initialisation restent
visibles et respectent un backoff ; consulter le log pour l’avancement réel.

Sauvegarde : `~/.codex/backups/intern-coverage-v13-20261001/before-nav.dump`.
Désactiver les requêtes NAV pour suspendre la collecte ; désactiver ses boards
pour retirer immédiatement cette source du catalogue. Sans progression du flux,
la règle de fraîcheur empêche les offres de rester visibles indéfiniment.
