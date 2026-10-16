Voici la transcription intégrale, fidèle et structurée de l'ensemble des pages fournies (de la page de garde jusqu'à la page 42), réordonnées chronologiquement. Le texte, les schémas, les tableaux et les encadrés ont été formatés de façon claire et directement interprétable par une IA.

(Note : Comme indiqué dans la table des matières, il reste les pages 43 à 46, correspondant aux sections 4, 5, 6 et 7. Vous pourrez les transmettre lorsque vous le souhaitez.)

---

# DEV — APPLICATION TROIS-TIERS



## Consultation de notes



### Déploiement sur trois conteneurs Docker



**Troisième partie — déploiement en conteneurs**


La même application, le même découpage, la même topologie — mais en conteneurs. Cette partie prépare la comparaison chiffrée entre les deux déploiements, qui fait l'objet de la quatrième.

---

## Table des matières



**TROISIÈME PARTIE — DÉPLOIEMENT SUR TROIS CONTENEURS DOCKER**

* **1. Contexte et objectif** .......................................................................... 35


* **1.1 Ce que le conteneur change** ....................................................... 35


* **1.2 Prérequis** .................................................................................... 36


* **1.3 Contraintes techniques** ............................................................. 36




* **2. La topologie cible** .............................................................................. 37


* **2.1 Du réseau interne au réseau du projet** .................................... 37


* **2.2 Plan des services** ....................................................................... 38


* **2.3 La règle d'or, en conteneurs** .................................................... 38




* **3. Déroulement du travail** ...................................................................... 39


* **Étape 11 — La couche données** .......................................................... 39


* **Étape 12 — La couche métier** ............................................................. 40


* **Étape 13 — Le proxy et la composition** ........................................... 41


* **Étape 14 — Vérifier et comparer** ..................................................... 41




* **4. Ce qui vient après** ............................................................................. 43


* **5. Livrables et organisation** .................................................................. 44


* **5.1 Récapitulatif des livrables** ......................................................... 44


* **5.2 Organisation du dépôt** ............................................................... 44


* **5.3 Critères d'évaluation** ................................................................. 44




* **6. Conduite des séances** ......................................................................... 45


* **7. Erreurs les plus fréquentes** ................................................................ 46



---

## 1. Contexte et objectif



L'application est maintenant répartie sur trois machines virtuelles, et vous disposez de mesures de référence. Cette troisième partie refait le même déploiement avec des conteneurs Docker : même application, même découpage en trois couches, même topologie réseau.

L'intérêt n'est pas d'obtenir un résultat différent — l'application se comportera de la même façon — mais de mesurer ce que coûtent deux techniques d'isolation pour un service rendu identique. C'est l'objet de la partie 2 du cours, et la matière de la comparaison qui viendra en partie 3.

### 1.1 Ce que le conteneur change



#### Schéma : Figure 9 — Les deux piles, pour le même déploiement à trois couches



```text
+-------------------------------------------------------+-------------------------------------------------------+
|               Trois machines virtuelles               |                    Trois conteneurs                   |
+-------------------------------------------------------+-------------------------------------------------------+
| [ Couche OS invité ] [ Couche OS invité ] [ Couche OS invité ] | [ Couche Dépendances ] [ Couche Dépendances ] [ Couche Dépendances ] |
|                       Hyperviseur                     |  <---> (un système d'exploitation en moins)           |
|                Système d'exploitation hôte            |                 Moteur de conteneurs                  |
|                    Matériel physique                  |              Noyau partagé · système hôte             |
|                                                       |                   Matériel physique                   |
+-------------------------------------------------------+-------------------------------------------------------+
```[cite: 3]

La différence tient en une ligne : un conteneur n'embarque pas de système d'exploitation[cite: 3]. Il utilise le noyau de l'hôte et n'en obtient qu'une vue restreinte, délimitée par des mécanismes du noyau — espaces de nommage pour cloisonner ce que le processus voit, groupes de contrôle pour limiter ce qu'il consomme[cite: 3].

Le tableau ci-dessous reprend les opérations que vous avez menées à la main en seconde partie, et ce qu'elles deviennent ici[cite: 3].

#### Tableau comparatif des opérations[cite: 3]
| En machine virtuelle, vous avez... | En conteneur, cela devient... |
|---|---|
| Installé des paquets sur un système | Des instructions `RUN` dans un fichier de construction d'image |[cite: 3]
| Fixé une adresse IP statique | Un nom de service, résolu par le moteur lui-même |[cite: 3]
| Écrit une unité de service système | La commande de démarrage et la politique de redémarrage |[cite: 3]
| Ouvert un port vers une autre machine | Un réseau partagé entre deux services, et rien d'autre |[cite: 3]
| Sauvegardé un répertoire de données | Un volume nommé, distinct du conteneur |[cite: 3]
| Pris un snapshot avant de modifier | Une reconstruction de l'image depuis son fichier de construction |[cite: 3]

---

> **À RETENIR**[cite: 6]
> Le renversement principal est là : en machine virtuelle, la configuration vit dans la machine et se modifie sur place[cite: 6]. En conteneur, elle vit dans un fichier versionné, et le conteneur se jette[cite: 6]. On ne corrige pas un conteneur : on corrige sa description, puis on le remplace[cite: 6].

### 1.2 Prérequis[cite: 6]

Cette partie suppose achevées les dix étapes précédentes[cite: 6]. Trois éléments en particulier vont être mis à l'épreuve[cite: 6].

* **La procédure de déploiement.** Le fichier rédigé à l'étape 9 est la matière première des images : chaque commande que vous y avez consignée devient une instruction[cite: 6]. Toute étape laissée implicite mequera ici[cite: 6].
* **La configuration externalisée.** Les variables d'environnement de l'étape 4 sont réemployées telles quelles, avec de nouvelles valeurs[cite: 6]. Aucun code ne doit changer[cite: 6].
* **Les mesures de référence.** Les relevés de l'étape 10 sont le point de comparaison[cite: 6]. Sans eux, cette partie produit des chiffres qui ne se rapportent à rien[cite: 6].

### 1.3 Contraintes techniques[cite: 6]

| Élément | Imposé | Laissé libre |
|---|---|---|
| **Moteur** | Docker Engine et Docker Compose | Version, tant qu'elle est récente |[cite: 6]
| **Images de base** | Officielles, avec une version explicite | Distribution et variante |[cite: 6]
| **Nombre de conteneurs** | Trois, un par couche | — |[cite: 6]
| **Réseaux** | Deux réseaux distincts, définis par le projet | Leurs noms |[cite: 6]
| **Publication de port** | Le proxy seulement | Le port de l'hôte |[cite: 6]
| **Orchestration** | Compose ; ni Swarm ni Kubernetes | — |[cite: 6]

> **ERREUR FRÉQUENTE**[cite: 6]
> N'utilisez jamais une image sans version explicite[cite: 6]. Une image reconstruite trois mois plus tard ne contiendra pas le même logiciel, et vos mesures cesseront d'être comparables[cite: 6]. C'est le premier réflexe de reproductibilité, et le plus souvent oublié[cite: 6].

---

## 2. La topologie cible[cite: 5]

#### Schéma : Figure 10 — Les trois conteneurs, les deux réseaux et le volume de données[cite: 5]

```text
POSTE DE TRAVAIL — moteur Docker (port publié 8080 -> 80)
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Navigateur http://localhost:8080 ]                                             |
|               |                                                                   |
|               v                                                                   |
|       [ proxy (nginx:1.27 - sert le client) ]                                     |
|               |                                                                   |
|     ==========|======================== (réseau frontal — proxy <-> metier)       |
|               |                                                                   |
|       [ metier (image construite · gunicorn) ]                                    |
|               |                                                                   |
|     ==========|======================== (réseau interne — metier <-> donnees)     |
|               |                                                                   |
|       [ donnees (postgres:16) ] <------> [ volume pgdata (données persistantes) ] |
|                                                                                   |
+-----------------------------------------------------------------------------------+
( Un seul port publié, celui du proxy.                                              )
( Le proxy et la base n'ont aucun réseau commun : la base est hors de portée,       )
( y compris depuis le proxy.                                                        )
```[cite: 5]

La topologie est celle de la seconde partie, traduite dans le vocabulaire de Docker[cite: 5]. Trois services, deux réseaux, un seul port publié, et un volume pour les données qui doivent survivre aux conteneurs[cite: 5].

### 2.1 Du réseau interne au réseau du projet[cite: 5]

Un réseau Docker défini par le projet joue le rôle du réseau interne de VirtualBox : les conteneurs qui y sont raccordés se voient entre eux, et rien d'autre ne les atteint tant qu'aucun port n'est publié[cite: 5]. Deux différences méritent d'être relevées, car elles changent la façon de travailler[cite: 5].

* **Les noms remplacent les adresses.** Le moteur fournit un serveur de noms interne : le service métier joint la base en l'appelant `donnees`, sans connaître son adresse[cite: 5]. Le plan d'adressage statique de l'étape 8 disparaît[cite: 5].
* **Le réglage par défaut est inversé.** En machine virtuelle, tout était ouvert et il fallait fermer[cite: 5]. Ici, rien n'est joignable depuis l'hôte et il faut publier explicitement ce que l'on veut exposer[cite: 5]. L'isolation est acquise par défaut ; c'est l'ouverture qui se déclare[cite: 5].

#### Pourquoi deux réseaux et non un seul[cite: 5]
Tous les conteneurs d'un même réseau se joignent mutuellement, sur tous leurs ports[cite: 5]. Un réseau unique laisserait donc le proxy atteindre la base, ce que la topologie de la seconde partie interdisait[cite: 5].

La solution propre consiste à déclarer deux réseaux : le proxy et le métier partagent le premier, le métier et la base partagent le second[cite: 5]. Le métier appartient aux deux, le proxy et la base n'ont aucun réseau commun — la base leur est mutuellement hors de portée[cite: 5].

---

> **À RETENIR**[cite: 7]
> C'est un avantage réel du conteneur sur la machine virtuelle, et il vaut la peine de le mesurer en temps de travail : ajouter un second segment réseau coûte ici deux lignes de déclaration, contre un adaptateur, un sous-réseau et trois fichiers de configuration en machine virtuelle[cite: 7].

### 2.2 Plan des services[cite: 7]

| Service | Image | Port interne | Publié | Réseaux |
|---|---|---|---|---|
| **proxy** | nginx, version épinglée | 80 | 8080 -> 80 | frontal |[cite: 7]
| **metier** | construite, base python slim | 8000 | non | frontal, interne |[cite: 7]
| **donnees** | postgres, version épinglée | 5432 | non | interne |[cite: 7]

Le volume nommé attaché au service de données est le seul élément qui survit à la destruction des conteneurs[cite: 7]. Tout le reste est reconstruit à partir des fichiers du dépôt : c'est la propriété que l'on cherche[cite: 7].

### 2.3 La règle d'or, en conteneurs[cite: 7]

Un seul point d'entrée, comme en seconde partie[cite: 7]. Elle se traduit ici par trois interdits, qui seront vérifiés à l'étape 14[cite: 7].

* Aucun port n'est publié en dehors de celui du proxy[cite: 7].
* Le proxy n'appartient pas au réseau de la base[cite: 7].
* Le client, dans le navigateur, ne s'adresse jamais au service métier directement[cite: 7].

> **ERREUR FRÉQUENTE**[cite: 7]
> La tentation la plus commune est de publier le port de la base « pour pouvoir s'y connecter avec un outil graphique »[cite: 7]. Cela rend la base joignable depuis tout le poste, et parfois depuis le réseau local : la topologie demandée n'existe plus[cite: 7]. Pour inspecter la base, ouvrez un terminal dans le conteneur ou passez par le service métier[cite: 7].

---

## 3. Déroulement du travail[cite: 8]

#### Schéma : Figure 11 — Les quatre étapes de la conteneurisation[cite: 8]

```text
[ Service données ] ----> [ Image métier ] ----> [ Proxy et composition ] ----> [ Vérifier et comparer ]
    (Étape 11)                (Étape 12)                (Étape 13)                    (Étape 14)
```[cite: 8]
*(Les étapes 1 à 10 doivent être achevées : c'est la même application qui est redéployée.)*[cite: 8]

Quatre étapes, dans l'ordre des dépendances, comme en seconde partie[cite: 8]. La différence est qu'ici, revenir en arrière ne coûte rien : détruire et reconstruire est l'opération normale, pas l'aveu d'un échec[cite: 8].

---

### Étape 11 — La couche données[cite: 8]

> **OBJECTIF**[cite: 8]
> Obtenir une base peuplée, persistante, et joignable du seul service métier[cite: 8].

#### Travail à faire[cite: 8]
* Déclarer le service à partir de l'image officielle du SGBD, avec une version explicite[cite: 8].
* Renseigner par variables d'environnement le nom de la base, l'utilisateur applicatif et son mot de passe[cite: 8].
* Attacher un volume nommé au répertoire de données, pour que celles-ci survivent au conteneur[cite: 8].
* Monter vos deux scripts SQL dans le répertoire d'initialisation prévu par l'image[cite: 8].
* Ne publier aucun port, et raccorder le service au seul réseau interne[cite: 8].
* Déclarer une sonde de santé, afin que les services dépendants attendent une base réellement prête[cite: 8].

> **ERREUR FRÉQUENTE**[cite: 8]
> Les scripts d'initialisation ne sont exécutés qu'au tout premier démarrage, lorsque le volume est vide[cite: 8]. Si vous modifiez ensuite votre schéma et relancez, il ne se passera rien, et vous chercherez longtemps pourquoi[cite: 8]. Pour rejouer l'initialisation, il faut supprimer le volume — opération à connaître dès maintenant, car vous la referez souvent[cite: 8].

> **CONSEIL**[cite: 8]
> Distinguez dès le départ deux commandes que les étudiants confondent : l'arrêt ordinaire conserve les volumes, tandis que la variante qui supprime aussi les volumes efface les données[cite: 8]. Notez-les toutes deux dans votre procédure, avec leur effet, plutôt que de les redécouvrir dans l'urgence[cite: 8].

> **LIVRABLE**[cite: 8]
> L'extrait de déclaration du service, le volume, et la preuve que la base contient bien le jeu de données attendu[cite: 8].

---

### Étape 12 — La couche métier[cite: 9]

> **OBJECTIF**[cite: 9]
> Construire une image de votre application et la faire dialoguer avec la base par son nom[cite: 9].

#### Travail à faire[cite: 9]
* Écrire le fichier de construction de l'image : image de base légère, installation des dépendances, copie du code, commande de démarrage[cite: 9].
* Ordonner les instructions pour tirer parti du cache : les dépendances avant le code applicatif[cite: 9].
* Écrire un fichier d'exclusion, pour que l'environnement virtuel, les fichiers temporaires et l'historique du dépôt n'entrent pas dans l'image[cite: 9].
* Faire pointer la variable d'adresse de la base sur le nom du service de données, et non sur une adresse[cite: 9].
* Raccorder le service aux deux réseaux, et ne publier aucun port[cite: 9].

#### Sur l'adresse d'écoute[cite: 9]
En seconde partie, faire écouter un service sur toutes les interfaces était une faute : la machine en avait plusieurs, dont certaines devaient rester privées[cite: 9]. Dans un conteneur, c'est au contraire la bonne pratique[cite: 9].

La raison est que le conteneur n'a qu'une interface par réseau auquel il est raccordé, et qu'il n'est de toute façon joignable que depuis ces réseaux[cite: 9]. L'isolation ne vient plus de l'adresse d'écoute mais de la non-publication du port[cite: 9]. Un service qui n'écouterait que sur la boucle locale serait au contraire injoignable depuis les autres conteneurs[cite: 9].

> **À RETENIR**[cite: 9]
> Ce renversement est un bon test de compréhension : la même configuration est une faute dans un cas et la règle dans l'autre, parce que la frontière d'isolation n'est pas au même endroit[cite: 9]. Sachez l'expliquer, c'est une question d'examen naturelle[cite: 9].

#### Sur la taille de l'image[cite: 9]
Une image construite sans précaution dépasse facilement le gigaoctet, alors qu'elle peut tenir en quelques centaines de mégaoctets[cite: 9]. Trois causes reviennent : une image de base complète au lieu d'une variante réduite, l'absence de fichier d'exclusion, et des fichiers de cache d'installation conservés dans l'image[cite: 9].

Relevez la taille obtenue : elle entre dans la comparaison de l'étape 14, en face de l'empreinte disque des trois machines virtuelles[cite: 9].

> **LIVRABLE**[cite: 9]
> Le fichier de construction, le fichier d'exclusion, et la taille de l'image obtenue[cite: 9].

---

### Étape 13 — Le proxy et la composition[cite: 1]

> **OBJECTIF**[cite: 1]
> Assembler les trois services en un ensemble qui démarre d'une seule commande[cite: 1].

#### Travail à faire[cite: 1]
* Construire l'image du proxy : image officielle du serveur web, configuration et fichiers du client copiés dedans[cite: 1].
* Faire pointer le renvoi des appels applicatifs sur le nom du service métier, et non sur une adresse[cite: 1].
* Écrire le fichier de composition : les trois services, les deux réseaux, le volume, et la seule publication de port[cite: 1].
* Déclarer les dépendances de démarrage en les conditionnant à l'état de santé, et non au simple ordre de lancement[cite: 1].
* Vérifier que l'ensemble démarre, s'arrête et redémarre par une commande unique[cite: 1].

#### Sur les dépendances de démarrage[cite: 1]
Déclarer qu'un service démarre après un autre ne dit rien de son état : un conteneur de base de données est « démarré » bien avant d'accepter des connexions[cite: 1]. Le service métier tentera donc de se connecter trop tôt et s'arrêtera[cite: 1].

Deux réponses coexistent, et les deux sont acceptables pourvu qu'elles soient assumées : conditionner le démarrage à la sonde de santé déclarée à l'étape 11, ou rendre le service métier capable de réessayer sa connexion[cite: 1]. La seconde est plus robuste en production, où rien ne garantit l'ordre[cite: 1].

> **CONSEIL**[cite: 1]
> Votre fichier de composition remplace la procédure de déploiement manuelle de la seconde partie[cite: 1]. Comparez les deux : le nombre de lignes, le temps de lecture, et surtout ce qu'il reste d'implicite dans chacune[cite: 1]. C'est un élément intéressant du compte rendu[cite: 1].

> **LIVRABLE**[cite: 1]
> Le fichier de composition, la configuration du proxy, et une capture montrant les trois services en marche[cite: 1].

---

### Étape 14 — Vérifier et comparer[cite: 1]

> **OBJECTIF**[cite: 1]
> Rejouer les vérifications de la seconde partie, puis mettre les deux déploiements face à face[cite: 1].

#### La matrice de joignabilité[cite: 1]
Même exercice qu'à l'étape 10, avec les mêmes cases « doit échouer »[cite: 1]. Notez que cette version est plus stricte que celle des machines virtuelles : le proxy n'atteint plus la base du tout[cite: 1].

| Depuis | vers proxy :80 | vers metier :8000 | vers donnees :5432 |
|---|---|---|---|
| **L'hôte** | oui, via 8080 | doit échouer | doit échouer |[cite: 10]
| **conteneur proxy** | — | oui | doit échouer |[cite: 10]
| **conteneur metier** | oui | — | oui |[cite: 10]
| **conteneur donnees** | doit échouer | oui | — |[cite: 10]

*Les vérifications se mènent depuis un terminal ouvert dans chaque conteneur[cite: 10]. Une tentative qui échoue doit échouer parce qu'aucune route n'existe, et non parce qu'un service est arrêté : vérifiez que tout est en marche avant de conclure[cite: 10].*

#### Les mesures, dans les mêmes conditions[cite: 10]
Reprenez les quatre grandeurs de l'étape 10, avec le même protocole : trois exécutions, médiane retenue, configuration consignée[cite: 10].

| Grandeur | Trois machines virtuelles | Trois conteneurs |
|---|---|---|
| **Temps de démarrage** | relevé à l'étape 10 | à relever |[cite: 10]
| **Mémoire consommée** | relevé à l'étape 10 | à relever |[cite: 10]
| **Empreinte disque** | fichiers de disque | images et volumes |[cite: 10]
| **Latence applicative** | relevé à l'étape 10 | à relever |[cite: 10]
| **Temps de mise en place** | depuis zéro, en séance | depuis zéro, en séance |[cite: 10]

> **ERREUR FRÉQUENTE**[cite: 10]
> Sur un poste sous Windows ou macOS, le moteur Docker s'exécute lui-même dans une machine virtuelle Linux[cite: 10]. La mémoire consommée par cette machine doit être comptée dans le relevé, sans quoi la comparaison est faussée en faveur des conteneurs[cite: 10]. Dites dans votre compte rendu comment vous l'avez mesurée, ou pourquoi vous ne pouviez pas[cite: 10].

#### Ce que la comparaison doit établir[cite: 10]
L'objectif n'est pas de désigner un gagnant, mais d'énoncer un écart et de l'expliquer[cite: 10]. Un compte rendu réussi répond à trois questions : de combien les chiffres diffèrent, quelle propriété technique explique chaque écart, et ce que le déploiement en conteneurs a perdu par rapport aux machines virtuelles[cite: 10].

La troisième question est celle qu'on oublie[cite: 10]. Le noyau étant partagé, la frontière entre conteneurs est logicielle et non matérielle : plus fine, donc plus rapide, mais aussi plus fragile — et il devient impossible d'exécuter un système d'exploitation différent de celui de l'hôte[cite: 10].

> **LIVRABLE**[cite: 10]
> La matrice de joignabilité remplie, le tableau comparatif chiffré, et un compte rendu de deux pages répondant aux trois questions ci-dessus[cite: 10].


Voici la transcription fidèle et structurée de la suite et fin du document (pages 43 à 46), remises dans l'ordre chronologique.

---

## 4. Ce qui vient après



Le déploiement en conteneurs clôt la partie 2 du cours. Deux prolongements sont prévus, et ils reposent tous deux sur ce que vous venez de construire.

| Suite | Ce qui sera fait | Ce que cela exige dès maintenant |
| --- | --- | --- |
| **Extensions** | Intégration de briques open source que vous n'écrivez pas — stockage de documents, moteur de recherche | Un fichier de composition lisible, où ajouter un service coûte quelques lignes |
| **Quatrième partie** | Injection de charge avec JMeter sur les deux déploiements | Les deux séries de mesures, relevées dans les mêmes conditions |

> **À RETENIR**
>
>
> Les extensions sont le véritable enjeu de la suite : vous y déploierez des composants professionnels que personne dans la salle n'a écrits. C'est une compétence distincte de celle du développement, et c'est celle que l'entreprise attend en premier.
>
>

---

## 5. Livrables et organisation



### 5.1 Récapitulatif des livrables



| Étape | Livrable | Forme |
| --- | --- | --- |
| **11** | Service de données conteneurisé | Déclaration du service, volume, preuve du peuplement |
| **12** | Image de la couche métier | Fichier de construction, fichier d'exclusion, taille |
| **13** | Ensemble composé | Fichier de composition, configuration du proxy |
| **14** | Vérification et comparaison | Matrice, tableau comparatif, compte rendu de deux pages |

### 5.2 Organisation du dépôt



Le dépôt est complété d'un dossier dédié aux conteneurs, à côté de celui du déploiement en machines virtuelles. Les deux coexistent : c'est ce qui rend la comparaison vérifiable.

```text
docker/
  metier.Dockerfile    construction de l'image applicative
  proxy.Dockerfile     configuration et fichiers du client
  compose.yaml         services, réseaux, volume, publication
  .dockerignore        ce qui n'entre pas dans les images
  PROCEDURE.md         construction et démarrage, pas à pas
docs/comparaison.md    tableau chiffré et analyse des écarts
```[cite: 11]

Conservez le dossier de déploiement en machines virtuelles intact[cite: 11]. Un correcteur doit pouvoir lire les deux procédures côte à côte : c'est la lecture la plus instructive de tout le projet[cite: 11].

### 5.3 Critères d'évaluation[cite: 11]

| Critère | Ce qui est regardé | Poids |
|---|---|---|
| **Images construites** | Versions épinglées, ordre des instructions, taille maîtrisée | 20 % |[cite: 11]
| **Composition** | Deux réseaux, volume, publication unique, dépendances de santé | 25 % |[cite: 11]
| **Isolation vérifiée** | Matrice remplie, cas négatifs réellement testés | 20 % |[cite: 11]
| **Comparaison chiffrée** | Protocole identique, moteur Docker comptabilisé | 20 % |[cite: 11]
| **Analyse et compte rendu** | Écarts expliqués, contreparties identifiées | 15 % |[cite: 11]

*La comparaison pèse autant que la réalisation : un déploiement en conteneurs qui fonctionne mais n'est pas mesuré ne remplit pas l'objectif de cette partie[cite: 11].*

---

## 6. Conduite des séances[cite: 14]

Le déploiement en conteneurs se mène en deux séances de quatre heures, comme celui en machines virtuelles[cite: 14].

| Séance | Ce qui doit être atteint | Point de contrôle |
|---|---|---|
| **Première** | Étapes 11 et 12 : base conteneurisée, image métier construite | Le service métier joint la base par son nom |[cite: 14]
| **Seconde** | Étapes 13 et 14 : composition, vérification, comparaison | Le tableau comparatif est rempli |[cite: 14]

La première séance est la plus exposée aux pertes de temps : construction d'image, volumes à supprimer, scripts d'initialisation qui ne se rejouent pas[cite: 14]. Prenez l'habitude de relire les journaux du conteneur avant de modifier quoi que ce soit — ils disent presque toujours ce qui ne va pas[cite: 14].

> **CONSEIL**[cite: 14]
> Tenez à jour la procédure au fil des essais, comme en seconde partie[cite: 14]. Elle sera plus courte que celle des machines virtuelles, et cette brièveté est elle-même un résultat à commenter dans le compte rendu[cite: 14].

---

## 7. Erreurs les plus fréquentes[cite: 13]

Ces sept situations concentrent l'essentiel du temps perdu sur cette partie[cite: 13]. Comme précédemment, le symptôme est la porte d'entrée du diagnostic[cite: 13].

| Symptôme observé | Cause la plus probable |
|---|---|
| **Le schéma modifié n'est pas pris en compte** | Le volume existe déjà : les scripts d'initialisation ne rejouent pas |[cite: 13]
| **Le métier s'arrête juste après le démarrage** | Il se connecte avant que la base n'accepte les connexions |[cite: 13]
| **Connexion refusée vers la boucle locale** | Adresse de base restée à localhost, qui désigne le conteneur lui-même |[cite: 13]
| **Les données disparaissent à chaque relance** | Aucun volume : le système de fichiers du conteneur est éphémère |[cite: 13]
| **L'image dépasse le gigaoctet** | Image de base complète, et fichier d'exclusion absent |[cite: 13]
| **Toute modification du code relance l'installation** | Le code copié avant l'installation des dépendances |[cite: 13]
| **L'hôte joint la base** | Port publié « pour un outil graphique » : la topologie est fausse |[cite: 13]

> **À RETENIR**[cite: 13]
> Le réflexe de diagnostic change par rapport aux machines virtuelles : lisez d'abord les journaux du conteneur, puis vérifiez son état, puis seulement le réseau[cite: 13]. Un conteneur qui redémarre en boucle vous dit pourquoi à chaque tentative — encore faut-il regarder[cite: 13].

```
