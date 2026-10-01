# Registre initial de sources de stages européens

Vérification : 30 septembre 2026. Recherche primaire bornée ; endpoints publics interrogés sans authentification. Ce registre étend le pilote, il ne représente pas tous les employeurs européens. Les URLs de boards ont été découvertes sur des pages de recrutement officielles ; les annonces ci-dessous ont ensuite été retrouvées dans les API publiques.

## Sources vérifiées et prêtes à importer

Les compteurs « candidats » portent uniquement sur les réponses consultées, après contrôle du titre/type et de la localisation. Ce ne sont ni des postes uniques ni un engagement que chaque annonce est encore réellement recrutée. Les traductions, dates anciennes et conditions des descriptions restent à vérifier par le pipeline. Pour SmartRecruiters, seule la première page de 100 annonces a été lue ; l'import devra paginer le board entier.

| Employeur | Connecteur / identifiant | Annonces lues / total annoncé | Candidats stage Europe observés | Exemple primaire |
|---|---|---:|---:|---|
| Winamax | `lever/winamax` | 29 / 29 | 10 | [STAGE  Backend - Pilotage des flux de paiement (H/F)](https://jobs.lever.co/winamax/6edaf1be-994a-4405-906f-38ea5dd4294c) — France |
| Protolabs | `lever/protolabs` | 84 / 84 | 1 | [Sales Intern](https://jobs.lever.co/protolabs/0443e27d-c670-4def-8d14-d5253210e26b) — Amsterdam |
| Doctolib | `greenhouse/doctolib` | 154 / 154 | 36 | [Business Development Representative Intern - Milano (x/f/m)](https://job-boards.greenhouse.io/doctolib/jobs/7800808003) — Milano, Milan, Italy |
| Aircall | `greenhouse/aircallioinc` | 70 / 70 | 9 | [Digital Customer Success Manager Intern](https://job-boards.greenhouse.io/aircallioinc/jobs/4414500009) — Paris Office |
| Human Rights Watch | `greenhouse/humanrightswatch` | 14 / 14 | 1 | [Europe & Central Asia Division Intern](https://job-boards.greenhouse.io/humanrightswatch/jobs/8836583002) — Berlin, Berlin, Germany |
| Accor | `smartrecruiters/accorcorpo` | 100 / 275 | 14 | [Assistant Relations Presse et Influence ALL Accor F/H/X (stage)](https://api.smartrecruiters.com/v1/companies/accorcorpo/postings/744000152370559) — Issy-les-Moulineaux, IDF, France |
| Ubisoft | `smartrecruiters/ubisoft2` | 100 / 308 | 26 | [Creator Project Manager Assistant - Internship (6 months) January 2027 (W/M/NB)](https://api.smartrecruiters.com/v1/companies/ubisoft2/postings/744000152722769) — Paris, IDF, France |
| Sopra Steria | `smartrecruiters/SopraSteria1` | 100 / 2041 | 31 | [Stage - Chef/fe de Projet - Services Publics - Ile de France](https://api.smartrecruiters.com/v1/companies/SopraSteria1/postings/744000152700194) — Courbevoie, IDF, France |
| IMC | `greenhouse/imc` | 170 / 170 | 6 | [Hardware Engineer Intern](https://job-boards.eu.greenhouse.io/imc/jobs/4927149101) — Amsterdam, Netherlands |
| Presidents Institute | `greenhouse/presidents` | 11 / 11 | 5 | [Commercial Intern](https://job-boards.greenhouse.io/presidents/jobs/7728142003) — Copenhagen, Denmark |
| Maven | `greenhouse/mavensecuritiesholdingltd` | 45 / 45 | 4 | [Amsterdam Trader Summer Internship 2027](https://job-boards.greenhouse.io/mavensecuritiesholdingltd/jobs/8048591) — Amsterdam |
| Bosch | `smartrecruiters/BoschGroup` | 100 / 4831 | 15 | [Problem solving gyakornok termelési minőségügyi területen](https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/744000152751279) — Maklár, , Hungary |
| CERN | `smartrecruiters/CERN` | 55 / 55 | 1 | [Short Term Internship 2026](https://api.smartrecruiters.com/v1/companies/CERN/postings/744000148423351) — Geneva, GE, Switzerland |

Le [registre JSON](europe-source-seed.json) conserve pour chaque source l'URL du board et l'endpoint réellement interrogé. Priorité conseillée : Doctolib, Aircall, Winamax, Protolabs, Presidents Institute pour les connecteurs existants ; Bosch, Accor, Ubisoft et Sopra Steria pour SmartRecruiters. IMC et Maven ajoutent finance et trading ; Human Rights Watch et CERN ajoutent droits humains et recherche.

## Pièges de classification observés

- SmartRecruiters publie parfois un stage explicite avec `typeOfEmployment.id = permanent` et `label = Full-time` : par exemple [Stage Consolidation chez Accor](https://api.smartrecruiters.com/v1/companies/accorcorpo/postings/744000152224589). Ce champ seul ne suffit pas pour rejeter une annonce ; les titres, champs métier spécifiques et descriptions doivent être interprétés ensemble.
- Inversement, [l'apprentissage AID au CERN](https://jobs.smartrecruiters.com/cern/744000151796289) est marqué `intern` mais décrit un apprentissage de trois ans. Il est exclu des candidats comptés ici. Une priorité explicite aux exclusions apprentissage/alternance évite ce faux positif.
- « Internal Auditor » chez IMC contient les premières lettres d'« intern », mais n'est pas un stage : utiliser des mots entiers, pas un préfixe libre.
- Accor et Ubisoft publient des versions françaises et anglaises de postes comparables : ces annonces doivent être rapprochées avec prudence, pas comptées comme des stages uniques sans contrôle.
- Une annonce Ubisoft mentionne encore janvier 2026 dans son titre alors qu'elle reste dans le board public. Présence dans l'API ne prouve pas fraîcheur réelle du recrutement.
- Bosch expose des stages hongrois dont le titre utilise « gyakornok », avec type structuré `intern` : une liste de mots français/anglais seule perdrait cette couverture.
- IMC retourne des liens `job-boards.eu.greenhouse.io` : préserver l'URL renvoyée par le fournisseur.
- Bosch inclut aussi des stages aux États-Unis et au Vietnam ; le pays structuré doit filtrer chaque annonce. Le siège européen de l'employeur n'est pas une preuve du lieu d'un poste.

## Pistes non admises dans le seed

- Les boards Ashby Andercore, Reonic, Light, PALO IT et Ivy ont des pages officielles trouvées par recherche, mais leurs endpoints publics ont répondu HTTP 403 pendant cette vérification. Aucun contournement tenté ; pas de seed validé pour ces cinq employeurs.
- Brooks Running : page de stage Amsterdam indexée par recherche, mais aucun candidat stage présent dans les 32 annonces retournées par le board Lever au moment du contrôle. Pas d'import sur la seule foi du résultat de recherche.
- HousingAnywhere : résultat de recherche évoquant un stage finance, mais aucune annonce stage dans les 2 offres renvoyées par l'API Greenhouse au moment du contrôle. Non admis.

## Limites et suites

Ce lot de 13 employeurs apporte plusieurs domaines (finance, RH, marketing, droit, opérations, logistique, industrie, recherche, ingénierie, jeux vidéo et santé numérique) et plusieurs pays européens, sans couvrir la totalité des métiers ou pays. Les comptes sont des observations ponctuelles, avant ingestion réelle, déduplication et filtrage du moteur. Le registre ne modifie aucune base. Une collecte complète, les résultats d'import et la couverture réellement publiée doivent être mesurés séparément.
