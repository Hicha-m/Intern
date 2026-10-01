# Taxonomie des offres : référentiels et recommandations UX

Recherche vérifiée le 1 octobre 2026. Sources primaires uniquement. Cette note prépare une décision ; elle ne décrit pas une fonctionnalité implémentée.

## ESCO : métiers, identifiants et synonymes

- **Hiérarchie vérifiée** : ISCO-08 fournit les quatre premiers niveaux ; les occupations ESCO occupent le niveau 5 et au-delà. Chaque occupation correspond à exactement un code ISCO-08. [Commission européenne — Occupations](https://esco.ec.europa.eu/en/classification/occupation_main)
- **Recherche multilingue** : chaque concept possède un libellé préféré, des libellés non préférés et des termes cachés dans les langues ESCO ; les profils ajoutent descriptions et compétences associées. [Commission européenne — Occupations](https://esco.ec.europa.eu/en/classification/occupation_main)
- **Conséquence proposée pour Intern** : conserver les identifiants ESCO et leurs alias pour reconnaître plusieurs intitulés du même métier. Construire une présentation simplifiée domaine → sous-domaine ; ne pas exposer mécaniquement les cinq niveaux officiels.
- **Limite** : cette classification organise les métiers ; elle ne prouve pas que ses libellés sont compris par des étudiants. La page consultée signale une erreur temporaire de son explorateur. Les compteurs diffèrent entre variantes linguistiques ; aucun volume exact n'est retenu ici. [Commission européenne — Occupations](https://esco.ec.europa.eu/en/classification/occupation_main)

## France Travail : ROME 4.0

- **Hiérarchie vérifiée** : l'export `cr_gd_dp_appellations_v4_utf8.csv` décrit grands domaines → domaines professionnels → métiers → appellations. La documentation distingue les types d'enregistrements et leurs codes. Preuve : §2.4, page 12. [France Travail — Description des exports ROME, v1.6](https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/description_fichiers_rome_open_data_V1.6.pdf#page=12)
- **Métier ≠ secteur ≠ compétence** : les exports possèdent des référentiels distincts pour métiers, compétences et secteurs/sous-secteurs d'activité. Preuve : sommaire et §2.22, §2.26–28. [France Travail — Description des exports ROME](https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/description_fichiers_rome_open_data_V1.6.pdf)
- **Usage opérationnel** : France Travail utilise le ROME pour décrire et rapprocher offres et demandes ; chaque fiche porte un code de cinq caractères et un intitulé. [France Travail — Le ROME et les fiches métiers](https://www.francetravail.fr/employeur/vos-recrutements/le-rome-et-les-fiches-metiers.html)
- **Accès actuel** : la fiche API publiée par France Travail décrit quatre API ROME 4.0 : métiers, compétences, contextes et fiches métiers. [France Travail sur data.gouv.fr — API ROME 4.0](https://www.data.gouv.fr/dataservices/api-repertoire-operationnel-des-metiers-et-des-emplois-rome-4-0)
- **Limite** : le PDF v1.6 date de décembre 2023 ; il prouve la structure documentée, pas la taille ni le schéma exact de la dernière livraison. Vérifier/versionner l'export retenu avant import. Aucun accès API authentifié ni import effectué.

## Baymard : filtres et navigation

- **Multi-sélection vérifiée** : dans ses tests e-commerce, Baymard recommande OR entre valeurs d'un même filtre et AND entre types de filtres ; les cases à cocher rendent cette possibilité visible. [Baymard — Combining Filter Options, 23 janvier 2024](https://baymard.com/research-articles/allow-applying-of-multiple-filter-values)
- **Catégories parentes accessibles** : les participants attendent de pouvoir ouvrir une catégorie parente pour explorer son ensemble ; la réduire à un titre non cliquable gêne la navigation. [Baymard — Homepage & Navigation UX](https://baymard.com/research-articles/ecommerce-navigation-best-practice)
- **Nombreuses options** : Baymard décrit les groupes repliables comme un moyen de garder un panneau de filtres utilisable lorsqu'il comporte beaucoup de catégories. [Baymard — Ecommerce Filter UI](https://baymard.com/blog/ecommerce-filter-ui)
- **Limite essentielle** : ces observations concernent le commerce. Leur transfert à une recherche de stages est une hypothèse produit ; aucune étude emplois/stages n'est démontrée par ces sources. Elles ne prescrivent ni un nombre optimal de domaines ni un rattachement unique de chaque offre.

## Traduction proposée pour Intern — hypothèses à valider

1. Offrir une taxonomie large dans les données, avec une interface à deux niveaux et recherche d'un sous-domaine par libellé ou alias.
2. Permettre « Tous les sous-domaines » d'un domaine et plusieurs sous-domaines ; l'union des descendants est une règle proposée, pas une prescription spécifique de Baymard.
3. Exemple de combinaison : (Backend **OU** Data Engineering) **ET** France **ET** Stage. Séparer le métier de l'industrie de l'employeur : « backend dans une banque » conserve le même métier.
4. Affecter un sous-domaine principal lorsque les missions sont claires ; garder des associations secondaires pour les offres transversales et un statut interne « à classer » lorsque la preuve manque. Une correspondance officielle unique d'un métier ESCO vers ISCO ne signifie pas qu'une offre ne contient qu'un métier.
5. Évaluer la compréhension des intitulés, le taux d'offres non classées, les recherches sans résultat et le temps pour trouver une offre pertinente avant de multiplier les sous-domaines.

Aucun mapping ESCO↔ROME universel, aucune qualité de classification automatique et aucun gain UX chiffré pour Intern ne sont établis par cette recherche.
