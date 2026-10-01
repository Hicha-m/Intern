# Intern — Domaines, sous-domaines et recherche

Date : 1 octobre 2026. Statut : recherche et proposition à valider, pas de modification du moteur ni de reclassement de la base. Les catégories ci-dessous sont une proposition produit Intern, pas une reproduction officielle d’ESCO ou de ROME.

## Recommandation

Créer une nomenclature commune **domaine métier → sous-domaine → intitulés et synonymes**, utilisée par les offres, les filtres, l’onboarding, les recherches sauvegardées et les recommandations. Prévoir une couverture large dès le départ, tout en affichant progressivement les choix.

Chaque offre doit avoir un état de classement ; chaque offre classée précisément doit avoir un sous-domaine principal. Un manque de preuve reste explicite. Forcer une catégorie pour atteindre 100 % de remplissage ferait disparaître des offres pertinentes des recherches.

Séparer trois axes : **métier exercé**, **secteur de l’entreprise**, **compétences**. Exemple illustratif : Backend Intern dans une banque = Informatique → Backend ; secteur Banque ; compétences Python et PostgreSQL uniquement si présentes dans l’annonce. Une technologie ne définit pas à elle seule un métier.

## Ce que le projet fait aujourd’hui

Vérification du code et lecture seule de PostgreSQL le 1 octobre 2026 :

- `jobboard/services/engine_quality.py` définit 13 domaines généraux. Le classificateur cherche une expression dans le titre et conserve le premier domaine correspondant. Il ne possède pas de hiérarchie de sous-domaines.
- `OfferEnrichment.domain` conserve un slug libre ; `frontend/src/pages/EngineControls.tsx` possède séparément la liste des libellés. Cela crée deux endroits à synchroniser.
- `Offer.role` existe et les recommandations attribuent un bonus sur ce champ, mais la table `Role` est vide sur la base vérifiée. Ce bonus ne peut donc pas servir aux offres actuelles.
- Base locale : 11 247 offres enregistrées ; 7 152 répondent à `filter_catalogue(published_offers(Offer.objects.all()), {})`. Sur ces 7 152, **4 534 (63,4 %) sont `unclassified`**, et toutes ont `role=NULL`. Les autres domaines dominants sont Ingénierie/industrie 634, Marketing/communication 535, Informatique/data 510. Ces comptes dépendent du moment et des règles de publication ; ils ne mesurent pas la précision du classement existant.

Conséquence : enrichir le vocabulaire, reprendre les offres existantes et mesurer les erreurs ensemble. Ajouter des options au frontend seul ne suffit pas.

## Concurrents : fonctions publiques vérifiées

Les pages publiques et aides permettent de vérifier les fonctions annoncées ou visibles, pas les algorithmes privés, leur précision ni l’efficacité de leur UX.

| Produit | Constat sourcé | Application à Intern |
| --- | --- | --- |
| HiringCafe | Le catalogue classique expose séparément Departments, Job Titles & Keywords, Company et Industry, ainsi que des critères d’expérience et de localisation. [Catalogue officiel](https://hiringcafe.com/classic?page=1) | Séparer métier/secteur et garder une recherche libre complémentaire. La liste détaillée des sous-départements n’a pas été auditée. |
| Simplify | Les préférences acceptent plusieurs types de postes et spécialisations, lieux et industries, avec exclusions. Une explication accompagne chaque match. [Aide officielle](https://help.simplify.jobs/articles/7272801-setting-your-job-match-preferences) | Sélection multiple, préférences persistantes et raisons compréhensibles. |
| Welcome to the Jungle | L’aide décrit métiers recherchés, industries subdivisées en sous-secteurs et sélection de plusieurs industries/sous-secteurs. [Filtres officiels](https://help.welcometothejungle.com/en/filter-your-job-search-on-welcome-to-the-jungle) | Proposer une hiérarchie, tout en distinguant les sous-secteurs d’entreprise des sous-domaines métier Intern. |
| HelloWork | La page stages propose des entrées par domaine, métier, ville et associations domaine + ville, notamment Informatique, Finance, Communication, RH et Tourisme. [Page stages](https://www.hellowork.com/fr-fr/stage.html) | Donner accès à tous les profils étudiants et permettre une exploration sans connaître l’intitulé exact. |
| JobTeaser | Le catalogue public présente recherche métier/entreprise/mot-clé, localisation et contrat ; les cartes de stages indiquent notamment leur durée. [Catalogue public](https://www.jobteaser.com/en/job-offers?locale=en) | Garder une entrée courte et les filtres propres aux stages : date, durée et pays. La hiérarchie interne des fonctions n’est pas confirmée ici. |
| Tsenta | L’éditeur annonce un matching selon CV, localisation, salaire, expérience et famille de métier, avec explication. [FAQ officielle](https://tsenta.com/) | Réutiliser les mêmes familles entre recherche et préférences. La taxonomie détaillée n’est pas publiée sur cette page ; la qualité annoncée n’a pas été mesurée. |

ESCO et ROME servent de références pour les intitulés et relations métiers, avec mappings explicites à construire. Les conseils de Baymard sur les filtres viennent du commerce en ligne : leur application aux stages est une hypothèse à tester. [Sources et limites détaillées](job-taxonomy-sources-2026-10-01.md).

## Nomenclature de départ

24 domaines et 206 sous-domaines proposés dans le tableau, avant ajout éventuel des généralistes manquants. Les sous-domaines représentent des familles de travail, les intitulés précis et synonymes restent un niveau de données complémentaire. Les slugs anglais sont stables ; les libellés affichés sont traduisibles. Les familles trop larges pourront être scindées après analyse du corpus, sans changer les identifiants historiques.

| Domaine | Slug | Sous-domaines proposés |
| --- | --- | --- |
| Informatique et systèmes | `software-it` | Frontend ; Backend ; Full stack ; Mobile ; Développement logiciel généraliste ; Systèmes embarqués et firmware ; Jeux vidéo et moteurs graphiques ; QA et automatisation des tests ; DevOps et SRE ; Cloud et plateforme ; Systèmes et réseaux ; Support et services informatiques |
| Data, IA et statistiques | `data-ai` | Analyse de données ; Business intelligence ; Data engineering ; Data science ; Machine learning ; IA générative et NLP ; Vision par ordinateur ; MLOps ; Statistiques et biostatistiques ; Gouvernance et qualité des données |
| Cybersécurité | `cybersecurity` | SOC et détection ; Réponse à incident et investigation ; Pentest et sécurité offensive ; Sécurité applicative ; Sécurité cloud et infrastructure ; Identités et accès ; Gouvernance, risques et conformité cyber ; Cryptographie et recherche sécurité |
| Ingénierie et conception technique | `engineering` | Mécanique ; Électronique ; Électrotechnique ; Automatique et contrôle ; Robotique et mécatronique ; Télécommunications ; Matériaux ; Simulation et calcul ; Systèmes et essais ; Conception de procédés |
| Production, qualité et maintenance | `industrial-operations` | Production et fabrication ; Méthodes et industrialisation ; Amélioration continue ; Qualité et métrologie ; Maintenance et fiabilité ; Hygiène et sécurité au travail ; Planification industrielle |
| Construction, architecture et urbanisme | `construction` | Génie civil et structures ; Conduite de travaux ; Architecture ; BIM et modélisation bâtiment ; Géotechnique ; Topographie ; Urbanisme et aménagement ; Économie de la construction |
| Énergie et environnement | `energy-environment` | Systèmes énergétiques ; Énergies renouvelables ; Efficacité énergétique ; Eau et assainissement ; Déchets et économie circulaire ; Écologie et biodiversité ; Évaluation carbone et climat ; Ingénierie environnementale ; Développement durable et RSE |
| Sciences et recherche | `science-research` | Biologie et biotechnologies ; Chimie ; Physique ; Mathématiques appliquées ; Géosciences ; Sciences des matériaux ; Recherche expérimentale et laboratoire ; Sciences humaines et sociales |
| Santé et recherche clinique | `health` | Recherche clinique ; Santé publique et épidémiologie ; Affaires réglementaires santé ; Pharmacovigilance ; Soins et paramédical ; Psychologie ; Nutrition et diététique ; Ingénierie biomédicale |
| Finance, banque et assurance | `finance` | Finance d’entreprise et FP&A ; Analyse financière ; Banque d’investissement et M&A ; Marchés et trading ; Recherche quantitative ; Gestion d’actifs ; Capital investissement et venture capital ; Risques financiers ; Crédit ; Actuariat et assurance |
| Comptabilité, audit et contrôle | `accounting-audit` | Comptabilité générale ; Comptabilité fournisseurs et clients ; Audit financier ; Contrôle de gestion ; Fiscalité ; Trésorerie ; Audit interne et contrôle interne |
| Droit et conformité | `legal-compliance` | Droit des affaires et contrats ; Droit social ; Droit public ; Propriété intellectuelle ; Protection des données ; Conformité réglementaire ; Contentieux ; Droit international et européen |
| Conseil, stratégie et organisation | `consulting-strategy` | Stratégie d’entreprise ; Conseil en management ; Conseil en organisation et processus ; Transformation ; Études économiques ; Conseil en politiques publiques ; Business analysis ; Conduite du changement |
| Produit et gestion de projet | `product-project` | Product management ; Product operations ; Gestion de projet numérique ; PMO ; Gestion de projet généraliste ; Coordination de programmes ; Méthodes agiles et facilitation |
| Marketing et acquisition | `marketing` | Marketing stratégique ; Études de marché ; Marketing produit ; Brand management ; Growth et acquisition ; SEO et SEA ; CRM et fidélisation ; Marketing de contenu ; Marketing opérationnel ; E-commerce et merchandising numérique |
| Communication, médias et rédaction | `communication-media` | Communication interne ; Communication externe ; Relations presse ; Relations publiques ; Réseaux sociaux et community management ; Journalisme ; Rédaction et édition ; Communication événementielle ; Traduction et localisation |
| Commerce et relation client | `sales-customer` | Business development ; Vente B2B ; Vente et distribution B2C ; Account management ; Customer success ; Support client ; Sales operations ; Commerce international et export |
| Ressources humaines | `human-resources` | Recrutement ; Administration RH ; Paie ; Formation et développement ; Relations sociales ; People analytics ; Mobilité et gestion des talents ; Marque employeur |
| Achats, logistique et transport | `supply-chain` | Achats ; Sourcing fournisseurs ; Supply chain ; Prévision de la demande ; Logistique et entreposage ; Transport ; Import-export et douanes ; Planification des approvisionnements |
| Design, création et audiovisuel | `design-creative` | UX research ; UX design ; UI et product design ; Design graphique ; Motion design et animation ; Design industriel ; Mode et textile ; Photographie ; Vidéo et production audiovisuelle ; Son et musique |
| Agriculture, alimentation et animal | `agriculture-food` | Agronomie ; Productions végétales ; Productions animales ; Agroécologie ; R&D alimentaire ; Qualité et sécurité alimentaire ; Gestion forestière ; Santé et soins animaliers |
| Hôtellerie, restauration et tourisme | `hospitality-tourism` | Accueil et réception ; Gestion hôtelière ; Restauration et cuisine ; Tourisme et voyages ; Gestion d’événements ; Revenue management ; Loisirs et animation |
| Éducation, social et action publique | `education-social-public` | Enseignement et pédagogie ; Ingénierie de formation ; Accompagnement social ; Insertion et orientation ; Action humanitaire ; Relations internationales et coopération ; Administration publique ; Développement territorial ; Médiation culturelle ; Gestion de projets associatifs |
| Administration, gestion et immobilier | `administration-real-estate` | Assistanat et coordination administrative ; Gestion documentaire ; Gestion des opérations générales ; Office management ; Gestion immobilière ; Analyse et investissement immobilier ; Gestion locative ; Gestion des services et installations |

Ajouter pour chaque domaine un **sous-domaine généraliste** lorsque la mission est identifiée mais pas sa spécialisation, distinct de l’état « À classer ». Exemple : « Software Engineering Intern » peut rester Développement logiciel généraliste ; ne pas le forcer en Backend. Le sous-domaine généraliste supplémentaire ne doit pas remplacer un sous-domaine généraliste déjà présent.

Règles de frontière à documenter : firmware = Informatique, conception électronique = Ingénierie ; création visuelle = Design, campagne = Marketing ; gestion d’événement = Tourisme/événements, communication autour de l’événement = Communication ; comptabilité = Comptabilité, gestion d’actifs = Finance. Une offre réellement transversale peut avoir des associations secondaires, uniquement si les missions le justifient.

## Associer les offres aux sous-domaines

1. **À l’import et lors d’une nouvelle révision source**, exploiter titre, département source, missions et description. Mapper les catégories source uniquement après vérification de leur sens : un département « Technology » peut regrouper plusieurs métiers.
2. Normaliser les intitulés multilingues avec alias validés : Backend Developer, développeur back-end, Backend-Entwickler ; Data Analyst, analyste de données, etc. Conserver le texte original. Les termes techniques restent distincts, par exemple C, C++ et C#.
3. Classer les fonctions exprimées dans les missions avant les compétences accessoires ou le contexte de l’employeur. « SQL » dans une annonce marketing ne suffit pas à la classer en Data. « Product » ou « engineer » seul ne suffit pas à choisir une spécialité.
4. Conserver sous-domaine principal, éventuels secondaires, méthode, version, niveau de confiance et preuves reliées à la révision source. La confiance du classificateur n’est pas une chance d’embauche ; elle peut rester qualitative tant qu’elle n’est pas calibrée.
5. États distincts : `classified` (spécialité identifiée), `broad` (généraliste identifié), `needs_review` (ambiguïté), `unclassified` (preuve insuffisante). Une offre ambiguë reste accessible au catalogue général et à la recherche libre. Ne pas la compter automatiquement dans un filtre précis.
6. Une correction humaine est conservée et prioritaire ; une révision modifiant les missions signale la correction à revoir au lieu de la remplacer silencieusement. Un signalement candidat crée une demande de revue, pas une modification immédiate du classement partagé.
7. Commencer avec règles et mappings explicables. Si la couverture reste insuffisante sur les textes multilingues, comparer un classificateur hors ligne au même jeu annoté. Aucun appel IA ou réseau dans une requête de recherche.

Exemples de contrôle : « Data Engineer Intern » → Data engineering ; « Mechanical Design Intern » → Mécanique, malgré « design » ; « Marketing Data Analyst Intern » → Analyse de données si les missions sont analytiques, Marketing en secondaire si justifié ; « Business Intern » sans missions précises → À classer.

## UX de recherche proposée

- Barre principale : mot-clé, lieu, **Domaines et métiers**. Ouverture du filtre : recherche dans le vocabulaire + domaines repliables + sous-domaines avec cases à cocher et nombres d’offres. Éviter une liste plate de tous les sous-domaines.
- Recherche dans le vocabulaire : « backend », « développement serveur » ou un alias anglais retrouve le même sous-domaine, avec son domaine affiché. Plusieurs interprétations donnent plusieurs choix ; aucun changement invisible de filtre.
- Sélection de plusieurs sous-domaines : **Backend OU Full stack**, puis **ET France**, **ET durée**, etc. Un domaine sélectionné couvre tous ses descendants, y compris son généraliste. Un sous-domaine reste sélectionnable sans sélectionner son parent entier.
- Cocher « Tout le domaine » mémorise le parent ; cocher toutes ses feuilles manuellement reste une sélection de feuilles. Les nouveaux sous-domaines sont inclus seulement dans le premier cas. État parent mixte explicite et bouton pour retirer tout le groupe.
- Valeurs sélectionnées visibles sous forme de badges supprimables. URL partageable et navigation retour conservant filtres, tri et page ; tout changement de filtre remet à la première page.
- Comptes par sous-domaine calculés sur les offres distinctes avec tous les autres filtres actifs, en retirant la sélection de cette même facette. Parent = union des descendants, pas somme brute si associations secondaires. Afficher les valeurs à zéro désactivées, tout en permettant de retirer une sélection devenue vide.
- Afficher le sous-domaine principal sur les cartes et le chemin complet dans le détail. Le secteur et les compétences ont leurs propres libellés.
- Mobile : panneau de filtres avec sélection provisoire, bouton « Voir N offres » ; les badges restent visibles après fermeture. Desktop : résultat actualisé avec gestion des réponses obsolètes et annonce du total.
- Clavier : contrôles natifs pour cases à cocher et boutons repliables, focus restauré à la fermeture, annonces de résultats sans déplacer le focus. Ne pas créer un composant ARIA tree complexe si une liste groupée suffit.
- Zéro résultat : proposer de retirer un critère ou d’élargir au domaine parent, avec effet annoncé et action explicite. Ne jamais élargir silencieusement une destination ou une spécialité.
- Les catégories sans offres peuvent rester découvrables via « Tous les domaines », avec compteur zéro. La nomenclature doit pouvoir couvrir de nouveaux profils même si le catalogue actuel est déséquilibré.

## Recommandations personnalisées

Utiliser le même vocabulaire pour les préférences du candidat. Permettre « tout Informatique » ou seulement « Backend + Full stack », plusieurs domaines et des exclusions explicites.

Ordre proposé à évaluer : spécialité choisie > domaine parent préféré > proximité de compétences ; lieu et contraintes restent des critères séparés. Une proximité entre sous-domaines ne découle pas automatiquement de leur parent : Data engineering et Biostatistiques ne sont pas interchangeables.

Si « Backend » seul est choisi, les offres Full stack ou généralistes apparaissent éventuellement dans une section explicite « Élargir la recherche », sans être présentées comme un match exact. Un filtre catalogue Backend reste strict. Les offres non classées n’obtiennent pas de bonus métier et ne sont pas déclarées incompatibles pour ce seul motif.

Afficher les raisons concrètes : « Backend fait partie de vos métiers choisis », « Paris correspond à votre zone », « Python figure dans l’offre et votre profil confirmé ». Les exclusions et conditions obligatoires priment. Éviter un pourcentage de matching non calibré. Les poids existants de V2 ne sont pas une référence validée pour cette nouvelle hiérarchie.

## Intégration proposée au projet

- Référentiel en base : `JobDomain`, `JobSubdomain` lié à un seul parent, libellés traduits/alias et mappings ESCO/ROME optionnels. Les associations externes doivent préciser version et type de correspondance ; ne pas prétendre à une équivalence exacte sans audit.
- `Offer` référence un sous-domaine principal nullable ; associations secondaires séparées avec unicité offre/sous-domaine. Les états et preuves sont conservés dans une structure de classement versionnée. `Role` reste le métier/intitulé normalisé complémentaire, rattachable au sous-domaine : ne pas renommer ou supprimer les rôles de préférences existants par commodité.
- API de vocabulaire commune frontend/backend ; filtres et facettes fondés sur les slugs stables. Les paramètres illustratifs `domains=software-it` et `subdomains=backend,full-stack` sont à spécifier ; ils ne sont pas disponibles aujourd’hui. Un couple parent/enfant redondant est simplifié explicitement ; une combinaison contradictoire est signalée.
- Conserver temporairement le filtre V1 `domain` et les recherches sauvegardées. Correspondances : `it-data` → union Informatique, Data/IA, Cybersécurité ; `engineering-industry` → Ingénierie + Production ; `finance-accounting` → Finance + Comptabilité ; `marketing-communication` → Marketing + Communication. Les autres correspondances exigent un audit : les règles historiques mêlent parfois fonction et secteur. Une conversion non fiable est présentée à l’utilisateur pour correction.
- Reclasser depuis les révisions source originales, pas uniquement depuis le domaine historique. Importer la nomenclature de façon idempotente, tester à blanc puis écrire par lots avec progression et possibilité de reprise. Garder un instantané des anciennes associations et la version pour pouvoir revenir en arrière.
- Le référentiel et les mappings sont versionnés ; fusion/scission de catégories conserve une table de redirections pour les liens et préférences. Les imports ne créent pas des catégories à partir de chaque titre brut.
- Filtres et classement restent en PostgreSQL avant pagination ; éviter que les associations secondaires multiplient les cartes ou les totaux. Mesurer aussi le coût des facettes ; conserver la fraîcheur, le périmètre européen et les règles de publication existants.

## Validation avant livraison

Proposition de protocole, pas de résultats déjà acquis :

1. Audit d’un échantillon stratifié par langue, source, domaine, sous-domaine et état de classement, avec un sous-ensemble aléatoire représentant le corpus. Annoter les missions et preuves ; faire une deuxième revue des cas ambigus.
2. Jeu de développement séparé du jeu d’évaluation. Mesurer précision/rappel et matrice de confusion par domaine et spécialité, couverture du classement et abstentions. Vérifier aussi les « généralistes » et « à classer » ; un bon taux de remplissage peut masquer des erreurs.
3. Cible de départ proposée : au moins 95 % de précision pour les associations automatiques de haute confiance sur le jeu indépendant, avec effectifs et incertitude reportés. Les catégories trop peu représentées restent à examiner ; ne pas garantir un seuil à partir de quelques exemples.
4. Tests produit : parent/enfants, OU/ET, exclusions, alias multilingues, compétences accessoires, offres transversales sans doublons, comptes de facettes, conservation URL/préférences, corrections humaines et migrations V1.
5. Sessions avec plusieurs profils étudiants : retrouver des stages backend, RH, mécanique et droit ; sélectionner deux spécialités ; retirer un filtre au clavier ; comprendre une recommandation. Mesurer temps pour trouver des offres pertinentes, abandons et recherche sans résultat ; comparer à l’interface actuelle. Les objectifs de gain UX restent à définir à partir de ce baseline.
6. Mesurer API liste + facettes sur le corpus réel, avec mêmes filtres et conditions avant/après. Pas de SLA annoncé à partir d’une seule base locale.

Ordre recommandé : référentiel commun → classificateur et reprise du corpus → filtre hiérarchique et badges → onboarding et recommandations → élargissement contrôlé et mesure UX.
