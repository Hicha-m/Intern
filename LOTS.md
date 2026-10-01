# Moteur de stages européens — lots d'implémentation

Périmètre autorisé le 30 septembre 2026 : implémenter [la spec](docs/INTERNSHIP_ENGINE_SPEC.md) et ajouter son bilan de livraison à la fin du document. Le découpage ci-dessous reprend son périmètre ; les fichiers applicatifs préexistants sans rapport sont conservés.

## Lot 1 — Schéma et collecte mutualisée

Modèles additifs, révisions de sources, Greenhouse/Ashby/Lever, registre de sources, planificateur et consommateur dédié. Backoff, leases, confirmation des disparitions et quarantaine des snapshots anormaux. Tests transactionnels et imports reproductibles.

deps: -

## Lot 2 — Qualité et matching expliqué

Extraction multilingue déterministe avec preuves, classification des stages, géographie européenne et contraintes. Matching séparant compatibilité, contradiction et inconnues. Déduplication prudente et tests des faux amis ; pas d'IA simulée.

deps: 1

## Lot 3 — API et fonctionnalités candidat

Catalogue public, filtres, recherches sauvegardées, feedback, exclusions d'entreprises, signalements, notifications internes et couverture. Imports de liens privés avec accès réseau borné. Préserver les contrats de candidature, reçus, confidentialité et suppression/export des données.

deps: 1,2

## Lot 4 — Intégration, vérification et documentation

Vérifier les parcours API réels, migrations, workers et non-régression. Documenter commandes, activation des sources et limites. Compléter la fin de la spec avec résultats observés ; séparer code livré et objectifs de couverture/qualité nécessitant un corpus et une exploitation réelle.

deps: 1,2,3

Les contrats de modèles permettent de travailler sur les modules des lots 2 et 3 en parallèle de leur socle ; leur intégration et leur recette restent dépendantes des lots précédents. Aucun merge ni déploiement distant n'est inclus dans cette exécution locale.

## Lot 5 — Extension des collecteurs et résilience par annonce

Personio/Recruitee, registre étendu, snapshots partiels avec diagnostics durables. Une erreur de détail SmartRecruiters n'empêche plus les autres offres valides d'être importées ; un lot partiel ne ferme aucune offre absente. Filtrage stage + Europe inchangé.

deps: 1,2

## Lot 6 — Découverte récurrente et flux transversaux

Requêtes persistées, curseurs, provenance, erreurs et couverture effective. Flux publics Arbeitnow et JobSearch Suède ; résolution des liens de carrière vers des boards connus ou candidats non supportés. Activation bornée après import pilote, worker et commandes d'exploitation.

deps: 5

## Lot 7 — Portails publics Workday

Connecteur de carrière public par employeur, configuration explicitement vérifiée, pagination et limites. Données de contrat et pays conservées ; snapshots partiels en cas de détail défaillant. Pas d'accès aux APIs privées du recruteur.

deps: 5

## Lot 8 — Recette de couverture réelle

Sauvegarde, migrations additives, tests métier, découverte et imports réels multi-domaines. Vérifier le catalogue servi au frontend, rapporter les nouveaux pays/sources/stages et les sources bloquées. Exécuter effectivement les cycles de découverte et mise à jour, puis consigner les limites dans la spec.

deps: 5,6,7

Extension explicitement autorisée par « implémente » après présentation de la section 13 bis. Les agents travaillent sur des fichiers attribués dans le checkout courant pour préserver le pilote non commité et les modifications d'autres tâches.

## Lot 9 — Couverture Europe V2 : portails RMK

Spec : `docs/EUROPE_COVERAGE_V2_SPEC.md`. Connecteur public SuccessFactors RMK pour
SAP, Schaeffler et ZF, reconnaissance des sources, import partiel sûr et worker.
Livré localement : +79 stages, 920 offres dans 21 pays ; 272 tests backend passent.
Les connecteurs et flux nationaux restants sont explicités dans la spec.

deps: 5,6,8

## Lot 10 — Couverture Europe V3 : iCIMS et Taleo

Spec : `docs/EUROPE_COVERAGE_V3_SPEC.md`. Deux connecteurs publics sur cinq portails
inspectés, intégrés à la découverte et au worker. Livraison locale : +8 stages,
928 offres dans 21 pays ; 282 tests backend passent. Snapshots partiels sûrs,
contrôles de pays, contrat, identité et expiration ; aucune migration nécessaire.

deps: 5,6,9

## Lot 11 — JobSpy et registre de portails

Spec : `docs/EUROPE_COVERAGE_V4_SPEC.md`. Imports publics directs, worker de
requêtes, curseurs, snapshots partiels et inventaires épinglés. Pilote LinkedIn :
53 stages supplémentaires ; 1 000 candidats employeurs enregistrés. 295 tests
backend passent sur PostgreSQL isolé. Validation Docker interrompue par une erreur
I/O du moteur ; état d'exploitation distinct du code testé.

deps: 5,6,10

## Lot 12 — Teamtailor, Workable et récupération des stages bilingues

Spécification : `docs/EUROPE_COVERAGE_V5_SPEC.md`.
Deux connecteurs publics, registre étendu, pilotes et snapshots partiels.
Reconnaissance titre anglais / description française ; correction des attributs
HTML sans valeur qui interrompaient la découverte LinkedIn. Suite : 304 tests.
Résultats : `docs/research/2026-09-30-v5-results.json` et rapports pilotes V5.
EURES, WTTJ, Eightfold et import direct des sources nationales restent à traiter.

## Lot 13 — Import direct EURES

Spécification : `docs/EUROPE_COVERAGE_V6_SPEC.md`.
Connecteur recherche + détails, qualification textuelle obligatoire en plus du
code contrat EURES, reprises et leases persistés, worker et service Compose dédiés.
315 tests backend. Pilote contrôlé : 13 stages publiables sur 41 annonces.
31 pays configurés ; les pages restantes sont collectées progressivement.
WTTJ, Eightfold et import direct des sources nationales restent à traiter.

## Lot 14 — Welcome to the Jungle

Spécification : `docs/EUROPE_COVERAGE_V7_SPEC.md`.
Index public, qualification stricte, résumés source explicitement étiquetés,
partition temporelle contre le plafond de pagination, worker et Compose dédiés.
320 tests backend passent. Pilote : 111 stages publiables sur 208 annonces.
47 pays configurés, collecte progressive. Eightfold et import direct des sources
nationales restent à traiter.

## Lot 15 — Eightfold PCSX

Spécification : `docs/EUROPE_COVERAGE_V8_SPEC.md`.
Portails inspectés, recherche multilingue, fiches complètes, filtrage européen,
import partiel et ordonnanceur existant. 326 tests backend passent.
Pilotes : NVIDIA 3 stages, Dolby 3. Microsoft suspendu après limitation de débit.
SmartApply et les autres tenants ne sont pas annoncés comme supportés.
Prochain chantier : import direct des sources nationales.

## Lot 16 — JobTech / Platsbanken, Suède

Spécification : `docs/EUROPE_COVERAGE_V9_SPEC.md`.
Import direct recherche + détails complets, quatre termes suédois/anglais,
taxonomie pays vérifiée, corroboration suédoise, expiration automatique et reprise
persistée. Pilote : 76 résultats examinés, 24 offres JobTech distinctes publiables
après contrôle du télétravail. Pages restantes collectées progressivement.
Worker local activé ; service Compose configuré, image non reconstruite.
Bundesagentur, France Travail et NAV restent à traiter.

## Lot 17 — Bundesagentur / Allemagne

Spécification : `docs/EUROPE_COVERAGE_V10_SPEC.md`.
Recherche publique v6 et fiches v4, qualification textuelle stricte malgré la
catégorie partagée Praktikum/Trainee, lieux vérifiés, dates de publication et
reprise durable. 346 tests backend passent. Pilote : 49 fiches publiables sur
60 résultats, 11 incertains. Trois requêtes configurées ; collecte continue locale
activée. Les volumes source ne sont pas des ajouts uniques tous fournisseurs.
Service Compose configuré sans reconstruction d’image dans ce lot.
France Travail et NAV restent à traiter.

## Lot 18 — Couverture observée et déduplication

Spécification : `docs/EUROPE_COVERAGE_V11_SPEC.md`. Page `/engine` avec chiffres
publiables par pays/source, pagination, erreurs, suspensions et déduplication.
Audit JSON reproductible via `audit_coverage`. Rapprochement conservateur par
liens normalisés + contenu et lieux identiques, fusion réversible existante.
Scan réel : zéro candidat répondant à toutes les preuves ; aucune fusion forcée.
Deux recherches Bundesagentur débloquées (références contenant un point),
reprise observée aux pages suivantes. 353 tests backend passent, build frontend
et 2 tests navigateur desktop/mobile/erreur passent. Collectes partielles et
limitations de débit restent visibles, sans promesse d’exhaustivité.

## Lot 19 — Reprise des collectes existantes

Spécification : `docs/EUROPE_COVERAGE_V12_SPEC.md`.
WTTJ : slug avec point accepté et reprise réelle 50 résultats/39 imports, page 10.
SmartRecruiters : changement de total et répétition d’ID donnent un snapshot
partiel ; essai réel encore limité par un timeout réseau. Indeed : erreurs HTTP
identifiées au lieu de faux résultats vides ; accès amont toujours en échec.
LinkedIn : cooldown partagé d’au moins une heure, sans contournement.
360 tests backend passent. Workers locaux relancés ; filtres stage/Europe inchangés.

## Lot 20 — NAV / Arbeidsplassen, Norvège

Spécification : `docs/EUROPE_COVERAGE_V13_SPEC.md`. Flux officiel incrémental,
jeton public expérimental ou `NAV_FEED_TOKEN`, curseur de page + offset, retrait
des annonces inactives et expiration norvégienne. Worker NAV local lancé et
service Compose configuré (image non reconstruite). Départ de rattrapage sur
184 jours, puis surveillance du flux. 367 tests backend passent, build frontend
et configuration Compose valides. Pilote : 1000 événements, 1 stage importé à
Bergen. La recherche de la page initiale a rencontré des timeouts ; reprise
vérifiée depuis un identifiant de page obtenu en direct. Pas d’exhaustivité prouvée.

## Lot 21 — Activation ciblée des entreprises ATS

Spécification : `docs/EUROPE_COVERAGE_V14_SPEC.md`. Commande bornée
`activate_ats_candidates` : prévisualisation, imports explicites, rapport par
source et pause sans rendement cible. 13 pilotes, 3 sources maintenues : Deloitte
Netherlands, Cabify et Picnic. 48 nouvelles fiches visibles sur ces sources après
contrôle, dont 37 aux Pays-Bas/Espagne ; pas de gain IT/GB/IE confirmé. Dix sources
suspendues. Sept faux positifs événementiels Deloitte retirés avec rules-8.
374 tests backend passent, services locaux sains et collecteurs relancés.
Rapports initiaux et vérifiés conservés ; aucune fusion automatique ni promesse
de stages uniques entre plateformes.
