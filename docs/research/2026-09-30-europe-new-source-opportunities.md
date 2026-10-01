# Nouvelles sources de stages européens

Recherche du 30 septembre 2026. Périmètre : tous domaines, stages confirmés,
localisation européenne prouvée. Recherche et un test de lecture uniquement ;
aucun nouveau connecteur installé ni aucune annonce importée pendant cet audit.

## Vérifications

- Le code local intègre JobSpy et le registre CSV d'ats-scrapers ; ce dernier
  n'est pas une installation de sa bibliothèque de collecte.
- GitHub API : ats-scrapers, MIT, non archivé, révision
  `6b44a1badc9bfbf5cf176f75265cc5729e520e99` ; ever-jobs, MIT, non archivé,
  révision `57399c8500211e1ce57b5fbfc5e4d2b2de58b33d`.
- JobTech : GET `https://jobsearch.api.jobtechdev.se/search?q=internship&limit=3`
  sans authentification, HTTP 200, total déclaré 28. Échantillon :
  `31294138` Företagssäljare Internship, `31294134` Digital Designer Internship,
  `31220431` Website Development Internship ; pays source `Sverige`.
  Aucun détail ni admissibilité vérifiés : 28 résultats, pas 28 stages validés.

## Connecteurs à piloter

| Source | Preuve et mécanisme | Limite / validation nécessaire |
| --- | --- | --- |
| EURES | Adaptateur Python : recherche JSON POST, détails par identifiant, champ positionOfferingCode et mapping internship | Code inspecté, pas de test réseau ; découpage pays/région nécessaire pour les plafonds de pagination |
| Teamtailor | Adaptateur lisant le flux public `https://{slug}.teamtailor.com/jobs.rss` | L'API officielle demande une clé ; tester couverture et détail du RSS par employeur |
| Workable | Adaptateur utilisant `/api/v1/widget/accounts/{slug}` et détails Markdown par offre | Tester détails, pays, pagination et disparitions sur plusieurs employeurs |
| Eightfold | Adaptateur prenant en charge plusieurs variantes de sites carrières et domaines personnalisés | Tester chaque variante ; aucun accès réseau validé ici |
| Welcome to the Jungle | Adaptateur Algolia, contrats structurés, découpage des recherches | Identifiants publics embarqués susceptibles de changer ; pagination plafonnée ; code inspecté seulement |
| JobTech / Suède | Recherche JSON publique, test positif ci-dessus | Termes suédois et anglais, vérification du contrat sur détails |
| Bundesagentur / Allemagne | Documentation communautaire jobsuche-api, recherche et détail ; angebotsart=34 | Catégorie mêlant Praktikum/Trainee ; interface non présentée comme API officielle stable |
| France Travail | API officielle des offres actives, détails et référentiels | Compte/application ; mesurer le rendement réel en stages avant priorisation |
| NAV / Norvège | Flux officiel incrémental, changements et états ACTIVE/INACTIVE | JWT ; jeton public pour expérimenter, inscription consommateur pour jeton privé ; filtrage local |

## Réutilisation GitHub

- [ats-scrapers](https://github.com/kalil0321/ats-scrapers) : première option,
  compatible avec notre moteur Python. Réutiliser des adaptateurs sélectionnés
  derrière notre normalisation et nos budgets, sans importer aveuglément le jeu
  de données hébergé. Les volumes annoncés sont mondiaux et tous contrats.
- [ever-jobs](https://github.com/ever-jobs/ever-jobs) : réservoir de connecteurs
  TypeScript ; présence vérifiée de plugins Workable et France Travail.
  Référence d'implémentation, pas motif de remplacer le moteur Django.
- [FAANG Europe tracker](https://github.com/Emjumaev/FAANG-2027-Internships-Tracker-Europe) :
  adaptateurs Amazon, Google et Eightfold présents ; périmètre technique restreint.
  GitHub ne détecte aucune licence : ne pas copier son code sans clarification.
- JobTeaser : catalogue public pertinent stages/jeunes diplômés ; aucune API
  ouverte stable ni connecteur GitHub vérifié pendant cette recherche.

## Recommandations pour Intern

1. Valider et activer progressivement les candidats du registre déjà importé,
   en identifiant le bon employeur et son portail public externe.
2. Piloter Teamtailor et Workable, puis EURES et WTTJ ; mesurer les stages uniques
   supplémentaires avant extension. JobTech est un petit pilote immédiatement
   accessible ; Eightfold et les sites propriétaires complètent les grands comptes.
3. Diversifier les requêtes par pays et langue : internship, stage/stagiaire,
   Praktikum/Praktikant, prácticas, tirocinio, estágio, praktik, staż.
   Ces termes servent à découvrir, jamais à publier sans qualification.
4. Partitionner les recherches plafonnées par région, date ou famille de métiers ;
   parcourir initialement le stock, puis maintenir un incrémental avec recouvrement.
5. Extraire les données structurées JobPosting et les sitemaps des pages carrières
   pour les employeurs sans adaptateur ; préserver URL, identifiant et preuves.
6. Réexaminer les exclusions sur un échantillon annoté : vrais stages rejetés,
   pays introuvables, titres multilingues. Ne pas assouplir le filtre Europe.
7. Mesurer par source : résultats lus, détails complets, stages européens,
   doublons, nouveaux publiés, erreurs, dernier succès et coût par ajout unique.
8. Ne fermer sur absence que pour un inventaire complet réussi. Les erreurs ou
   recherches partielles ne prouvent aucune fermeture.

Ordre proposé = jugement technique, pas rendement mesuré. Aucun chiffre de
nouveaux stages atteignable n'est établi par cette recherche.

## Sources techniques

- [EURES code](https://github.com/kalil0321/ats-scrapers/blob/6b44a1badc9bfbf5cf176f75265cc5729e520e99/src/ats_scrapers/scrapers/eures.py)
- [Teamtailor RSS code](https://github.com/kalil0321/ats-scrapers/blob/6b44a1badc9bfbf5cf176f75265cc5729e520e99/src/ats_scrapers/scrapers/teamtailor.py)
- [Workable code](https://github.com/kalil0321/ats-scrapers/blob/6b44a1badc9bfbf5cf176f75265cc5729e520e99/src/ats_scrapers/scrapers/workable.py)
- [Eightfold code](https://github.com/kalil0321/ats-scrapers/blob/6b44a1badc9bfbf5cf176f75265cc5729e520e99/src/ats_scrapers/scrapers/eightfold.py)
- [WTTJ code](https://github.com/kalil0321/ats-scrapers/blob/6b44a1badc9bfbf5cf176f75265cc5729e520e99/src/ats_scrapers/scrapers/welcometothejungle.py)
- [JobTech API](https://jobsearch.api.jobtechdev.se/)
- [Jobsuche documentation communautaire](https://github.com/bundesAPI/jobsuche-api)
- [France Travail API officielle](https://www.data.gouv.fr/dataservices/api-offres-demploi)
- [NAV feed officiel](https://navikt.github.io/pam-stilling-feed/)
- [Teamtailor API officielle](https://docs.teamtailor.com/)
- [JobTeaser catalogue](https://www.jobteaser.com/en/job-offers?locale=en)
