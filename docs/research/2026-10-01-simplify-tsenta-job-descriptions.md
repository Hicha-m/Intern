# Descriptions d’offres : Simplify et Tsenta

Recherche effectuée le 1er octobre 2026. Périmètre : pages publiques accessibles sans compte. Les résultats décrivent ce que chaque service publie ; ils ne valident pas les offres auprès des employeurs. L’inspection porte sur le contenu rendu accessible au navigateur de recherche, sans audit visuel complet ni accès au tableau de bord connecté.

## Ce qui est observable chez Simplify

[L’offre Verisk](https://simplify.jobs/p/1920c9e2-0339-4167-aa3a-3a0e8dd29095/Technology-Intern) expose deux niveaux de lecture : **Summary** et **Full posting**. Le résumé répartit les informations en **Requirements**, **Responsibilities** et **Desired Qualifications**. Au-dessus figurent saison du stage, état de fraîcheur, deadline, rémunération, type de contrat, diplômes, lieux, modalités hybrides et sponsoring. La durée et le début restent dans une puce : 10 semaines, début le 2 juin 2027. La description complète conserve le détail du programme et de la sélection. La deadline affichée en tête est le 3 octobre, alors que le corps indique le 2 octobre à 23 h 59 ET ; une conversion de fuseau pourrait l’expliquer, mais cela n’est pas établi.

[L’offre Google](https://simplify.jobs/p/af61d076-e995-4be0-b148-f81b9786edb3/Software-Engineer-Intern) expose aussi résumé, annonce complète, compétences et critères de diplôme. La durée apparaît dans plusieurs formulations : au moins 13 semaines dans le résumé et 13–17 semaines dans une autre partie de l’annonce, avec démarrage en mai, juin ou juillet 2027. C’est un exemple de contraintes temporelles qu’un simple champ unique ne représente pas complètement. La date de publication et la deadline constituent des informations distinctes du début du stage.

[L’offre Primer](https://simplify.jobs/p/a5f886cf-d5b6-41ac-9bfc-98833aff9bb6/Software-Engineer-Intern) place l’engagement souhaité de 4 à 8 mois dans **Desired Qualifications**. Le libellé permet de conserver la différence entre préférence et obligation, même si la durée n’est pas présentée dans une fiche dédiée.

**Déclaration officielle, à séparer du constat :** [la page d’accueil Simplify](https://simplify.jobs/) indique que ses outils lisent la description pour proposer une adaptation du CV et que de nouvelles offres sont ajoutées toutes les heures. Cela ne documente pas comment leurs résumés, dates, diplômes ou durées sont extraits. Aucun détail de pipeline, schéma d’extraction, prompt, modèle ou mesure de précision n’a été confirmé par les pages consultées.

## Ce qui est observable chez Tsenta

[Le catalogue public](https://tsenta.com/jobs/) sépare les filtres d’expérience, modalités de travail, types de contrat, ancienneté et sponsoring. Le site affirme collecter des rôles depuis plus de 50 000 pages carrière ; cette couverture est une déclaration du service, pas une mesure vérifiée dans cette recherche.

[L’offre Retensa](https://tsenta.com/jobs/retensa-employee-retention-ai-product-intern-fall-2026-b1150d9c-1777-456c-a1d3-20145e2fdb65) présente **Skills**, **Job Description** et **Benefits**. Dans le texte figurent **Summary**, **Responsibilities**, **Required Qualifications**, **Preferred Qualifications**, **Required Skills** et **Internship Start Date**. Le début est formulé comme automne 2026, sans jour précis. Les métadonnées affichent pourtant lieu non renseigné et rémunération absente, alors que le corps mentionne télétravail, fuseau horaire et gratification. Le bloc Benefits répète plusieurs informations déjà présentes. La couverture et le classement sont donc imparfaits sur cet exemple.

[L’offre Bosch](https://tsenta.com/jobs/robert-bosch-internship-program-q4-embedded-software-intern-c-c-2f1216f1-e0a0-4c26-82d8-0b12ca0218d5) affiche des champs dédiés **Education**, **Intern Terms**, **Duration** et **Relevant Majors**. La durée est rendue comme environ 6 mois ; le corps contient la plage exacte du 2 octobre 2026 au 25 mars 2027, distincte de la fenêtre de candidature. Le corps conserve aussi des intitulés techniques comme companyDescription, jobDescription et additionalInformation : l’enrichissement des champs ne garantit pas une bonne lisibilité de la description.

[L’offre Unilever](https://tsenta.com/jobs/unilever-internship-digital-marketing-1e74bf49-47e1-46a8-a2fd-95c9a2b3d2c1) affiche **Duration 3–6 months** et **Intern Terms Summer 2026, Fall 2026**. Le texte précise pourtant minimum 3 mois et idéalement 6 mois, à au moins 32 heures par semaine, avec démarrage en juillet, août ou septembre. Transformer cela en simple intervalle fait perdre le caractère préférentiel des 6 mois. La convention de stage et l’inscription étudiante apparaissent dans la description.

[L’offre Statkraft](https://tsenta.com/jobs/statkraft-intern-portfolio-flex-strategy-southern-european-o-4d59805b-757b-4e95-8d34-6421a1f8094a) combine une durée dédiée de 6 mois et des saisons automne 2026/hiver 2027. Le démarrage exact au 1er octobre 2026 reste dans le corps. Celui-ci conserve de longs passages sans vraie segmentation. Tsenta expose donc bien une extraction de métadonnées de stage sur certaines annonces, mais toutes les descriptions ne sont pas uniformément restructurées.

**Déclaration officielle, à séparer du constat :** [AI Disclosure](https://tsenta.com/ai-disclosure) explique que Tsenta utilise l’IA pour le matching avec le CV, l’adaptation des documents et l’automatisation des formulaires. La page énumère plusieurs ATS pris en charge. Elle ne documente pas le procédé exact qui produit les sections d’une offre, ses compétences, sa durée ou ses saisons. Le fait qu’un champ normalisé apparaisse est observable ; attribuer ce champ à un LLM précis, un parseur précis ou un prompt serait une hypothèse.

## Ce qu’Intern peut reprendre

Ces propositions sont une synthèse de conception, pas une description des algorithmes propriétaires des concurrents.

1. Un résumé rapide, des rubriques constantes et l’annonce complète accessible constituent le motif le plus utile de Simplify.
2. Une fiche de stage dédiée peut reprendre l’idée de Tsenta : durée, début, fin, rythme, saison, formation, lieu et modalités. Seuls les champs étayés doivent être affichés.
3. Garder minimum, maximum, idéal et prolongation possibles séparés. Ne pas convertir une préférence en condition obligatoire.
4. Séparer publication, première découverte, dernière vérification, deadline et début du stage. Ne pas utiliser une date générique pour tous ces rôles.
5. Relier chaque valeur et chaque exigence à un extrait source. Un résumé doit préserver les conditions d’éligibilité, les exceptions et les obligations documentaires.
6. Ne pas présenter une liste de mots-clés comme la liste exhaustive des exigences. Les compétences souhaitées, obligations légales, diplômes, langues, disponibilités et documents demandés ont des conséquences différentes.
7. Prévoir une valeur absente et un conflit explicite. Les pages étudiées montrent à la fois des champs incomplets, des textes peu segmentés et des pertes de nuance ; leur interface constitue une inspiration, pas une garantie de qualité des données.

## Limites

Échantillon restreint de pages publiques. Certaines réponses du navigateur de recherche sont indexées avec des dates de collecte différentes ; l’ancienneté affichée a varié entre résultats, donc aucun horodatage dynamique exact n’est retenu comme preuve. Sans accès aux sources internes des services, leur architecture de collecte/extraction et leur précision restent inconnues. Une validation des règles d’Intern devra porter sur ses propres annonces et leurs sources employeur.
