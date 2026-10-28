# E4.2c — Diplômes, certifications et langues sourcés

Branche : `feat/e4-qualification-evidence`, dépendante des preuves E4.2a/b.

## Critères et réalisation

Les diplômes et certifications nommés sont distingués des compétences techniques.
Bac+N, bachelor, master, BSc, MSc, doctorat/PhD, MBA et certaines formations
françaises sont conservés sous leurs noms explicites, sans équivalence scolaire
inventée. « AWS » seul n’est pas une certification ; les noms/identifiants connus
CISSP, CISM, CEH, OSCP, CompTIA Security+/Network+, CKA/CKAD, AZ-900/104/305 et AWS
Certified Solutions Architect sont reconnus. Les formes Associate/Professional
restent distinctes, sans compter à nouveau le nom générique qui les contient.
Il s’agit de mentions dans l’annonce, pas d’une vérification de validité du diplôme
ou de la certification ni d’une recommandation d’achat ou de formation.

Qualification obligatoire, souhaitée, négative ou inconnue ; alternatives et
absence explicite de diplôme requis sont conservées séparément. Les indices
mélangés restent non qualifiés. « Master Python » et une licence logicielle ne
créent pas de diplôme. URLs, sections entreprise et contenu caché sont exclus.
Les abréviations Ph.D./B.Sc./M.Sc. sont protégées du découpage en phrases pour ne
pas perdre le qualificatif qui suit. Cette option n’altère pas le mode utilisé
par les extracteurs de compétences et d’expérience existants.

## Réutilisation des langues

`offer_languages.language_facts` et sa version `languages-2` sont réutilisés.
Aucune taxonomie de langues ni règle de niveau parallèle. Les groupes gardent
codes, modalité, opérateur `any/all` et niveau textuel, sans inférer nationalité ou
équivalence CEFR. Les matrices et conflits par champ restent enregistrés ; une
alternative « English or French » ne devient pas deux langues obligatoires.
Les preuves individuelles sont reliées à leur extrait original, la matrice de
langues conserve la représentation normalisée du composant existant.
Le futur panel doit utiliser cette matrice pour les conflits, pas compter une
mention isolée comme exigence globale.

## Persistance et migration

`QualificationExtraction` conserve révision, version incluant celle des langues,
date, champs traités, couverture (`processed`, `no_description`, `too_large`) et
matrice des langues par champ. La limite de lecture est 200 000 caractères.
`QualificationEvidence` conserve type, code, valeur normalisée, qualification,
alternative, extrait littéral, chemin et offsets en points de code Unicode.
La confiance numérique reste inconnue (`null`), sans score fabriqué.

Les imports entreprise et publications recruteur créent ces preuves dans leurs
transactions. Un rejeu identique est idempotent ; une nouvelle révision garde les
anciennes preuves. La sélection courante exige un corpus d’offres explicite,
source fraîche et active, hash courant et version d’extraction courante.
Les données privées du candidat et son CV ne participent pas à ce traitement.

La migration 0042 ajoute les tables sans remplir fictivement l’historique.
Contraintes sur type, qualification, offsets et unicité ; retour de schéma refusé
si des extractions seraient perdues. Conserver le schéma pour un retour applicatif
ou archiver/réconcilier explicitement les preuves avant de le supprimer.

## Validation

Première passe : 38 tests ciblés Django/PostgreSQL réussis en 37,829 secondes,
comprenant neuf nouveaux tests, régressions compétences/expérience/recruteur et
migration aller/retour protégée. Cas : vocabulaire, faux amis, abréviations,
négations FR/EN, alternatives, langues et niveaux, conflits, sources cachées,
extraits/offsets, idempotence, historique, couverture et contraintes SQL.

Ruff, contrôle Django, absence de dérive des migrations et `git diff --check`
réussis. Régression Django complète finale : **664 tests réussis sur PostgreSQL
isolé en 249,714 secondes**, dont les neuf nouveaux tests de qualifications. Aucune précision/rappel du
PRD revendiquée : ces cas contrôlés ne sont pas le corpus indépendant de 200
annonces, dont la constitution et l’évaluation restent ouvertes.

Aucun nouveau parcours UI ou endpoint public : build frontend, Playwright et
recette navigateur non relancés pour cette extraction interne. Sources réseau
contrôlées, PostgreSQL réel. Aucun déploiement, migration de production, collecte
externe ou CI distante exécutée.

## Suite

Les vocabulaires de diplômes/certifications sont initiaux, FR/EN ; les autres noms,
langues et équivalences ne sont pas déclarés couverts. Les contextes mixtes et
conditions de substitution demandent encore annotation/validation. Les mentions
négatives, alternatives et contradictions ne doivent pas être agrégées comme des
exigences indépendantes certaines. Les nombres du panel devront compter des
offres uniques, jamais les répétitions d’une même mention.

Prochaine livraison : API SQL de synthèse du corpus et accès aux preuves,
avec filtres communs, dates, effectifs, dénominateurs et inconnus visibles. Les
reprises historiques E4.5 et l’évaluation de qualité E0.4 restent nécessaires.


## Publication pour revue

Branche publiée et [PR brouillon #13](https://github.com/Hicha-m/Intern/pull/13)
ouverte vers la story précédente (#12). Les autres stories sont liées dans la
[roadmap](../../ROADMAP.md#revue-des-stories-publiées). Aucun changement fusionné
sur master ni déploiement effectué ; les résultats ci-dessus sont locaux.
