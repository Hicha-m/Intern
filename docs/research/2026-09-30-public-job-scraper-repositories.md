# Dépôts pour collecter les annonces publiques

Vérifié le 30 septembre 2026 : README, API GitHub, fichiers sources et inventaires
CSV. Aucun scraper tiers installé ou exécuté ; le fonctionnement réel sur nos
marchés reste à tester. Les volumes d'inventaires ne mesurent pas des stages actifs.

## 1. speedyapply/JobSpy — collecte transversale

https://github.com/speedyapply/JobSpy

Python, licence MIT, 4 373 étoiles au contrôle, dépôt non archivé. Dernier commit
observé sur main : `7f0ff3ab25`, 30 septembre 2026 ; commit précédent
`349dda47a8` : correctif de recherche Glassdoor et option de description.
Le README documente LinkedIn, Indeed, Glassdoor, Google et d'autres plateformes,
les lieux, pays, pagination, types de contrat et descriptions. Le code LinkedIn
lit la recherche guest et les fiches `/jobs/view/{id}` : il peut produire une
annonce sans devoir découvrir son board employeur.

https://github.com/speedyapply/JobSpy/blob/main/jobspy/linkedin/__init__.py

Candidat principal pour un pilote d'ingestion directe. Pagination et accès restent
bornés et sensibles aux limitations des plateformes ; un correctif dans main
ne garantit pas qu'il soit publié dans la version PyPI. Vérifier les paramètres
sur la version épinglée, les réponses réelles et la qualité géographique avant
activation. Notre filtre stage + Europe et notre déduplication restent nécessaires.
L'ancien dépôt Bunsly/JobSpy redirige vers speedyapply/JobSpy.

## 2. kalil0321/ats-scrapers — registre et connecteurs

https://github.com/kalil0321/ats-scrapers

Python, MIT, dépôt non archivé. Dernier commit main observé : `6b44a1badc`,
2 septembre 2026 (préparation v0.3.0). Le README présente connecteurs ATS,
sources nationales et jeu de données public. Le code EURES existe :
https://github.com/kalil0321/ats-scrapers/blob/main/src/ats_scrapers/scrapers/eures.py

Apport immédiatement pertinent : les inventaires `name,slug,url` dans
https://github.com/kalil0321/ats-scrapers/tree/main/ats-companies

Lignes réellement comptées, hors en-tête, sur sept fichiers compatibles avec des
familles déjà intégrées chez Intern :

| Inventaire | Lignes |
|---|---:|
| Greenhouse | 6 031 |
| Lever | 2 402 |
| Ashby | 3 448 |
| Workday | 3 530 |
| SmartRecruiters | 2 747 |
| Personio | 2 463 |
| Recruitee | 1 164 |
| Total | 21 785 |

Ce sont des entrées de tenants mondiaux, pas 21 785 entreprises uniques, pas des
sources toutes encore valides et pas des stages européens. Le README indique aussi
une migration de schéma pour certains CSV. Importer comme candidats avec provenance,
validation des URL, déduplication puis pilote borné ; ne pas activer tout le registre
aveuglément. Cela répond directement à notre limite actuelle de 40 boards.

## 3. simonesiega/european-tech-opportunities-2027 — référence proche du produit

https://github.com/simonesiega/european-tech-opportunities-2027

Python, MIT, dépôt non archivé ; dernier commit main observé `d81852402d`,
29 septembre 2026. Cible Europe / tech / 2027, avec stages ET new-grad : périmètre
plus étroit et contrat plus large que le nôtre. Propose annuaire, API et exports.

Code effectivement inspecté :
https://github.com/simonesiega/european-tech-opportunities-2027/blob/main/src/opportunities/scrapers/linkedin.py

Collecte du HTML public non authentifié, parsing du détail, description et critères,
contrôle des pages bloquées, détection de fermeture et revérification d'annonces
connues. Intérêt : référence pour notre pipeline LinkedIn, pas une preuve que toutes
ses sources fonctionneront depuis notre réseau. Ne pas confondre la date récente
du code avec la dernière collecte réussie affichée par le README (28 septembre).

## Autres dépôts examinés

- https://github.com/PaulMcInnis/JobFunnel : MIT mais archivé ; ne pas retenir
  comme nouvelle dépendance principale.
- https://github.com/jonahr4/InternAtlas : exemple de découverte de boards et
  agrégation ; licence non détectée par l'API GitHub lors du contrôle. Ne pas
  reprendre son code avant clarification de la licence. Les volumes annoncés
  dans son README et sa description divergent et n'ont pas été vérifiés.

## Ordre proposé pour Intern

1. Tester JobSpy sur quelques recherches européennes avec descriptions, mesurer
   les stages réellement nouveaux, les échecs, doublons et pays incertains.
2. Exploiter le registre ats-scrapers comme source de candidats, en commençant
   par les employeurs européens manquants et les connecteurs déjà disponibles.
3. Reprendre les principes de collecte/revérification du projet européen pour
   supprimer notre dépendance à la présence d'un lien ATS dans chaque fiche.

Ces bibliothèques complètent l'importeur actuel ; elles ne remplacent pas les
contrôles de qualité ni la preuve de couverture. Aucune preuve qu'InternHunt
utilise un de ces dépôts.
