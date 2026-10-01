# InternHunt : pourquoi 6 646 offres contre 928 chez Intern ?

Contrôle du 30 septembre 2026, 21:12 UTC. Sources publiques et lecture de la base
locale. Aucun accès au serveur d'InternHunt, aucune candidature, aucun changement
aux règles de publication. Cet audit actualise les chiffres du premier audit du
jour (qui décrivait encore le pilote à 17 boards).

## Conclusion

Le déficit principal est la collecte et la conversion des annonces découvertes
en offres, pas le nombre de technologies ATS implémentées. Dix connecteurs sur
40 portails ne représentent pas une couverture européenne large. La base contient
2 632 offres brutes : le manque existe donc avant le filtrage des 928 publiées.
L'ajout de cinq portails iCIMS/Taleo n'a produit que huit stages supplémentaires.
Il faut maintenant mesurer et alimenter les offres à grande échelle.

## Comparaison vérifiée

| Mesure | Résultat |
|---|---|
| InternHunt, cinq régions européennes, sans Middle East | 6 646 résultats affichés sur chacune des trois pages examinées |
| Intern local | 928 publiées, 2 632 offres en base |
| Portails locaux activés | 40, sur dix familles ATS |
| LinkedIn local | 47 recherches configurées, 21 avaient réussi au moins un passage |
| Résultats LinkedIn enregistrés | 222 lignes de découverte : 135 `needs_access`, 87 `pending` |
| Import direct d'offres LinkedIn | Aucun chemin implémenté ; le résolveur cherche seulement un lien vers un board employeur supporté |
| Indeed / Glassdoor | Aucun connecteur de collecte actif dans le moteur inspecté |
| File de découverte globale | 1 799 lignes `pending`, pas 1 799 stages éligibles garantis |
| Qualification locale | 274 offres européennes au contrat incertain ; 29 stages confirmés au pays inconnu |

Les lignes de découverte ne sont pas nécessairement des postes uniques : plusieurs
requêtes peuvent trouver la même annonce. Aucun chiffre de cette table ne permet
de déduire un nombre garanti de nouvelles publications.

## Ce qu'InternHunt fait publiquement

[L'accueil](https://internhunt.eu/) annonce une collecte LinkedIn, Indeed,
Glassdoor et plus de 100 pages carrières, avec déduplication et passage horaire.
C'est une déclaration de l'éditeur, pas une implémentation serveur vérifiée.
Le catalogue et ses filtres sont disponibles dans le HTML public. Sa bibliothèque,
ses requêtes et sa politique exacte d'expiration restent inconnues.

[La requête Europe examinée](https://internhunt.eu/jobs?region=Western+Europe&region=UK+%26+Ireland&region=Southern+Europe&region=Nordics&region=Eastern+Europe)
renvoie 6 646 rôles. Sur les trois premières pages : 150 lignes, 111 libellés
d'employeur distincts. La comparaison exacte après normalisation trouve 107 de
ces libellés sans nom identique dans notre registre. Ce n'est pas une résolution
d'entités : des variantes comme Airbus Defence and Space peuvent correspondre à
un groupe déjà suivi. Exemples effectivement absents du registre : Apple, AMD,
Thales, EDF, Siemens, BMW Group et Groupe SII.

Revue des titres : 44/150 signalent apprentissage, alternance, emploi étudiant ou
programme graduate. Deux titres mêlant stage/statut étudiant sont laissés à part.
C'est un échantillon récent non aléatoire et une revue de titres : ne pas extrapoler
ce ratio aux 6 646 annonces et ne pas présenter les 106 restantes comme toutes
validées. Les compteurs ne mesurent donc pas exactement notre définition du stage.
Cette différence n'explique pas notre faible couverture de sources.

## Les pertes identifiées dans notre code

1. `engine_search_discovery.resolve_result` cherche une URL de board. Une annonce
   publique qui n'expose pas ce lien ne devient pas une offre, même si son titre
   est un stage. Les 135 cas LinkedIn portent `linkedin_no_public_employer_link` :
   cela ne signifie pas que leur description est nécessairement inaccessible.
2. `linkedin_discovery.fetch_page` fixe `f_TPR=r604800`, soit les sept derniers
   jours. C'est une collecte incrémentale sans constitution initiale du stock
   encore ouvert. La pagination repart de zéro après le plafond de 150 résultats
   par recherche ; le découpage métier existe mais n'avait pas encore été atteint.
3. Le worker traite deux requêtes de découverte par cycle et huit résolutions
   par requête, dans la même boucle que les imports de boards. Un import lent
   retarde donc aussi l'acquisition de nouvelles sources.
4. Les connecteurs ne sont pas des flux couvrant tous les clients d'un ATS :
   seuls les employeurs enregistrés sont parcourus. Les trois hosts RMK, quatre
   tenants iCIMS et un Taleo restent explicitement limités à leur registre.
5. iCIMS ne recherche que `intern`. RMK recherche quatre termes mais s'arrête
   après quatre pages par terme ; le dernier run SAP signale réellement
   `page_budget_exceeded`. Les résultats coupés ne sont pas repris par curseur.
6. Le classifieur laisse certains titres `STAGE Backend/Fullstack` chez Winamax
   incertains. Une règle exige une corroboration textuelle spécifique pour le
   terme stage. Il faut vérifier les descriptions et les métadonnées employeur
   avant de corriger ces faux négatifs, pas publier toute la catégorie incertaine.

## Priorités pour atteindre une couverture comparable

1. **Importer une annonce sans exiger un board déjà supporté.** Ajouter un chemin
   d'ingestion depuis les flux et fiches publiques lisibles, avec identifiant,
   description, pays prouvé, contrat, attribution et lien de candidature. Garder
   les pages réellement inaccessibles en attente. LinkedIn, Arbeitnow et JobSearch
   sont des entrées à examiner ; ne pas annoncer Indeed/Glassdoor opérationnels
   tant qu'un accès utilisable n'a pas été vérifié.
2. **Séparer stock initial et nouveautés.** Rattraper les stages encore ouverts
   au-delà de sept jours, avec curseurs persistants, découpage pays/langue/métier,
   limites réseau et reprise après interruption. Dédupliquer entre requêtes.
3. **Élargir les employeurs en fonction des lacunes mesurées.** Utiliser notamment
   les entreprises observées dans l'échantillon, vérifier leur source officielle,
   puis enregistrer et importer leur portail. Prioriser le rendement réel en
   stages nouveaux plutôt que le nombre de familles ATS ajoutées.
4. **Découpler découverte, résolution et collecte.** Files et budgets indépendants,
   reprise de la file `pending`, puis mesure découverte → détail lu → stage confirmé
   → Europe confirmée → offre unique fraîche publiée.
5. **Corriger le rappel à preuves constantes.** Auditer les 274 contrats incertains
   en Europe et les 29 stages au pays inconnu ; analyser les annonces filtrées
   avant insertion dans les connecteurs. Ne pas assimiler ces volumes à un gain acquis.

Recette proposée : constituer un benchmark indépendant d'offres employeurs actives,
réparties par pays, langue et domaine. Pour chacune, expliquer présente/absente et
l'étape de perte. Publier séparément le rappel sur ce benchmark, les faux stages,
les erreurs géographiques, les doublons et la fraîcheur. Le chiffre 6 646 seul
n'est ni un test d'exhaustivité ni une cible à atteindre en relâchant les filtres.

[Mesures et échantillon reproductible](2026-09-30-internhunt-gap-audit.json) : URLs,
empreintes SHA-256 des pages, IDs/titres/employeurs et agrégats locaux. Les descriptions
complètes ne sont pas recopiées. Ce tour livre l'audit ; les cinq priorités ci-dessus
ne sont pas annoncées comme implémentées.
