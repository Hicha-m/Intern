# DOCUMENTATION TECHNIQUE : INJECTION DE CHARGE AVEC JMETER



## PAGE DE COUVERTURE



* **En-tête** : DEV — APPLICATION TROIS-TIERS


* **Titre principal** : Consultation de notes


* **Sous-titre** : Injection de charge avec JMeter


* **Section** : Quatrième partie — mesure et comparaison


* **Description** : Les deux déploiements sont soumis au même scénario de charge, dans les mêmes conditions. L'objectif n'est pas de désigner un gagnant, mais d'établir un écart chiffré et d'en expliquer la cause technique.



---

## PAGE 48 : TABLE DES MATIÈRES



**DEV — Injection de charge avec JMeter**


**Table des matières**


**QUATRIÈME PARTIE — INJECTION DE CHARGE AVEC JMETER**

* **1. Contexte et objectif** ... 49


* **1.1 Ce que mesurer veut dire** ... 49


* **1.2 Prérequis** ... 49


* **1.3 Contraintes techniques** ... 50




* **2. Le protocole de mesure** ... 51


* **2.1 Le scénario de charge** ... 51


* **2.2 Le profil de charge** ... 52


* **2.3 La règle d'or de la mesure** ... 52




* **3. Déroulement du travail** ... 54


* **Étape 15 — Construire le plan de test** ... 54


* **Étape 16 — Étalonner le protocole** ... 55


* **Étape 17 — Exécuter les campagnes** ... 55


* **Étape 18 — Analyser et comparer** ... 56




* **4. Ce qui vient après** ... 58


* **5. Livrables et organisation** ... 59


* **5.1 Récapitulatif des livrables** ... 59


* **5.2 Organisation du dépôt** ... 59


* **5.3 Critères d'évaluation** ... 59




* **6. Conduite des séances** ... 60


* **7. Erreurs les plus fréquentes** ... 61



---

## PAGE 49 : 1. CONTEXTE ET OBJECTIF



### 1. Contexte et objectif



Vous disposez de la même application déployée de deux façons : sur trois machines virtuelles, puis sur trois conteneurs. Cette dernière partie les soumet au même scénario de charge, dans les mêmes conditions, et en tire une comparaison chiffrée.

L'objectif n'est pas de désigner un gagnant. Les deux déploiements hébergent le même code et interrogent la même base : à faible charge, ils se comportent de la même façon. Ce que la mesure révèle, c'est à quelle charge chacun décroche, et pourquoi.

### 1.1 Ce que mesurer veut dire



Trois grandeurs sont indissociables, et aucune n'a de sens seule :

* **Le débit** : Le nombre de requêtes servies par seconde. Un débit élevé ne vaut rien si la moitié des requêtes échouent.


* **La latence** : Le temps de réponse. Ce n'est pas un nombre mais une distribution : la moyenne masque précisément ce qui gêne les utilisateurs.


* **Le taux d'erreur** : La proportion de requêtes qui n'aboutissent pas. Au-delà de quelques pour cent, les deux grandeurs précédentes ne décrivent plus le service rendu.



#### Pourquoi la moyenne ne suffit pas



Une latence moyenne de 200 millisecondes peut recouvrir deux situations opposées : toutes les requêtes autour de 200 millisecondes, ou bien quatre-vingt-quinze pour cent à 50 millisecondes et cinq pour cent à 3 secondes. Le second cas est celui d'un service que les utilisateurs jugeront mauvais, et la moyenne ne le dit pas.

On relève donc des centiles : la médiane, puis le 90e, le 95e et le 99e. Le 95e centile signifie que quatre-vingt-quinze pour cent des requêtes ont été servies au moins aussi vite. C'est la grandeur de référence dans l'industrie.

> **[ENCADRÉ : À RETENIR]**
>
>
> La question à laquelle cette partie répond n'est donc pas « lequel est le plus rapide », mais « jusqu'à quelle charge chacun tient, et qu'est-ce qui cède en premier ». Une réponse correcte nomme le goulot d'étranglement.
>
>

### 1.2 Prérequis



Cette partie suppose les quatorze étapes précédentes achevées. Quatre éléments seront mis à l'épreuve dès la première séance :

* **Les deux déploiements opérationnels** : Chacun doit pouvoir être démarré et arrêté à la demande, sans reconfuguration.


* **Un jeu de données identique** : Les mêmes scripts de peuplement, donc le même volume et le même contenu des deux côtés.


* **Assez de comptes de test** : Une vingtaine au minimum. Avec un seul compte, toutes les requêtes frappent la même ligne, les caches font leur travail et les chiffres devienneent flatteurs.



---

## PAGE 50 : 1.3 CONTRAINTES TECHNIQUES



*(Suite des prérequis de la page précédente)* :

* **Les mesures de référence** : Les relevés des étapes 10 et 14 servent de point de départ et de contrôle de cohérence.



### 1.3 Contraintes techniques



| Élément | Imposé | Laissé libre |
|---|---|---|
| **Outil d'injection** | Apache JMeter | Version, tant qu'elle est récente |
| **Exécution des campagnes** | En ligne de commande, sans interface graphique | — |
| **Emplacement de l'injecteur** | Sur l'hôte, hors du système mesuré | — |
| **Résultats bruts** | Fichier de résultats conservé et versionné | Format de sortie |
| **Durée d'un palier** | Au moins soixante secondes hors montée | Nombre de paliers |

> **[ENCADRÉ : ERREUR FRÉQUENTE]**
>
>
> L'interface graphique de JMeter sert à construire et à déboguer un plan de test, jamais à exécuter une campagne. Elle consomme du processeur et de la mémoire sur la machine même qui injecte, et fausse donc les mesures. Toute campagne se lance en ligne de commande.
>
>

---

## PAGE 51 : 2. LE PROTOCOLE DE MESURE



### 2. Le protocole de mesure



#### [DESCRIPTION DU SCHÉMA : Figure 12 — La chaîne de mesure]



* **Injecteur (sur l'hôte, hors du système mesuré)** : Contient `JMeter`. Il envoie des requêtes HTTP vers le système sous test.


* **SYSTÈME SOUS TEST (un seul déploiement à la fois)** : Encadré en pointillés comprenant :


* `proxy` (point d'entrée)


* `metier` (Python)


* `donnees` (PostgreSQL)


* Note : machines virtuelles puis conteneurs — jamais les deux en marche ensemble.




* **Mesures relevées** :
* **Côté client** : débit, latence, erreurs.


* **Côté serveur** : processeur, mémoire, entrées-sorties, connexions.




* *Légende* : Figure 12 — La chaîne de mesure : l'injecteur, le système sous test, et ce que l'on relève de chaque côté.



L'injecteur s'exécute sur l'hôte, en dehors du système mesuré. Il envoie des requêtes et relève ce qu'un utilisateur perçoit. En parallèle, vous relevez sur le système lui-même ce qu'il consomme : ce sont ces deux séries qui, mises face à face, permettent d'expliquer un écart plutôt que de le constater.

### 2.1 Le scénario de charge



Un utilisateur virtuel reproduit le parcours étudiant de la première partie : il se connecte, puis consulte ses notes. C'est le parcours le plus représentatif, et le seul qui traverse les trois couches.

| Ordre | Requête | Ce qui doit être vérifié |
|---|---|---|
| **1** | Ouverture de session avec un compte tiré du fichier de comptes | Le code de retour et la présence du jeton ou du cookie |
| **2** | Consultation des notes de l'utilisateur connecté | Le code de retour et la présence d'au moins une note |

#### Les éléments du plan de test



Six éléments suffisent, et chacun répond à un besoin précis du scénario :

* **Le groupe d'unités** : Il porte le nombre d'utilisateurs simultanés, la durée de montée et la durée totale. C'est lui que vous ferez varier d'un palier à l'autre.


* **Le jeu de données** : Un fichier de comptes, lu ligne par ligne, pour que les utilisateurs virtuels ne soient pas tous la même personne.


* **Le gestionnaire de cookies** : Sans lui, chaque requête repart sans session et la seconde requête échoue systématiquement.


* **L'extracteur** : Il récupère le jeton renvoyé par la connexion pour le réinjecter dans la requête suivante, si votre mécanisme de session repose sur un jeton plutôt qu'un cookie.


* **Les assertions** : Elles vérifient que la réponse est bien celle attendue, et non une page d'erreur renvoyée avec un code de succès.



---

## PAGE 52 : 2.2 LE PROFIL DE CHARGE



*(Suite des éléments du plan de test)* :

* **La temporisation** : Un temps de réflexion entre deux requêtes, pour que le scénario ressemble à un usage réel et non à une attaque.



> **[ENCADRÉ : ERREUR FRÉQUENTE]**
>
>
> Sans assertion, une application qui renvoie sa page de connexion à chaque requête affiche un taux d'erreur de zéro pour cent : le serveur a bien répondu. C'est l'erreur la plus coûteuse de cette partie, parce qu'elle produit des chiffres plausibles et entièrement faux.
>
>

### 2.2 Le profil de charge



#### [DESCRIPTION DU SCHÉMA : Figure 13 — Montée par paliers]



* **Axe Y** : utilisateurs simultanés.


* **Axe X** : temps.


* **Forme du graphique** : Une courbe en escalier représentant la montée progressive par paliers avec des phases de « montée » suivies de plateaux stables désignés comme « fenêtre de mesure » `|-------|`.


* *Légende* : Chaque palier dure assez longtemps pour être mesuré hors montée. On monte jusqu'à ce que le débit cesse de croître. Figure 13 — Montée par paliers, avec une fenêtre de mesure sur chaque plateau.



On n'applique pas une charge d'emblée : on monte par paliers, et l'on mesure sur chaque plateau, une fois la montée terminée. Inclure la période de montée dans le relevé sous-estime le débit et gonfle la latence.

On augmente tant que le débit croît. Lorsqu'il cesse de croître alors que la latence, elle, continue d'augmenter, le point de saturation est atteint : c'est la grandeur intéressante de toute cette partie, et elle sera différente pour les deux déploiements.

| Relevé côté client | Relevé côté serveur |
|---|---|
| Débit, en requêtes par seconde | Charge processeur, par service |
| Latence : médiane, 90e, 95e et 99e centiles | Mémoire consommée, par service |
| Taux d'erreur, par type de requête | Entrées-sorties disque sur la base |
| Nombre d'utilisateurs simultanés effectifs | Nombre de connexions ouvertes à la base |

### 2.3 La règle d'or de la mesure



On ne compare que ce qui a été mesuré dans les mêmes conditions. Cette règle paraît évidente et se viole sans y penser ; elle se décline ici en cinq exigences :

* Même jeu de données, même scénario, même plan de test, même fichier de comptes.


* Même poste, même session de travail, applications de fond identiques.



---

## PAGE 53 : EXIGENCES DE MESURE ET À RETENIR



*(Suite des exigences de la règle d'or)* :

* Un seul déploiement en marche à la fois : deux déploiements allumés se partagent le processeur.


* L'injecteur ne doit jamais être le facteur limitant — c'est l'objet de l'étalonnage de l'étape 16.


* Chaque chiffre est consigné avec la configuration qui l'a produit.



> **[ENCADRÉ : À RETENIR]**
>
>
> Un résultat non reproductible n'est pas un résultat. Si deux exécutions identiques donnent des chiffres qui diffèrent de plus de dix pour cent, ce n'est pas le déploiement que vous mesurez : c'est le bruit de votre poste.
>
>

---

## PAGE 54 : 3. DÉROULEMENT DU TRAVAIL & ÉTAPE 15



### 3. Déroulement du travail



#### [DESCRIPTION DU SCHÉMA : Figure 14 — Les quatre étapes de la mesure]



Diagramme de flux linéaire :
`[Plan de test (Étape 15)]` ➔ `[Étalonnage du protocole (Étape 16)]` ➔ `[Campagnes de mesure (Étape 17)]` ➔ `[Analyse et comparaison (Étape 18)]`
*Note associée* : Les deux déploiements doivent être opérationnels et démarrables à la demande.
*Légende* : Figure 14 — Les quatre étapes de la mesure.

Quatre étapes. Les deux premières construisent et valident l'instrument ; les deux dernières s'en servent. Il est tentant de sauter l'étape 16 : c'est elle qui décide si vos chiffres vaudront dire quelque chose.

### Étape 15 — Construire le plan de test



> **[OBJECTIF]**
>
>
> Obtenir un scénario qui reproduit fidèlement le parcours étudiant et qui détecte ses propres échecs.
>
>

#### Travail à faire



* Créer le plan de test avec un groupe d'unités, les deux requêtes du parcours, et le gestionnaire de cookies.


* Préparer un fichier de comptes de test et le brancher comme jeu de données du plan.


* Ajouter l'extraction du jeton de session si votre authentification en utilise un.


* Ajouter une assertion sur chacune des deux requêtes : code de retour attendu, et contenu attendu.


* Valider le plan avec un seul utilisateur et une seule itération, dans l'interface graphique, jusqu'à ce que le parcours réussisse.


* Vérifier qu'il échoue quand il doit échouer : avec un mot de passe erroné, l'assertion doit se déclencher.



> **[CONSEIL]**
>
>
> Ce dernier point est le test du test. Un plan qui ne sait pas détecter un échec produira des campagnes entières sans jamais signaler que l'application ne répond plus correctement. Prenez cinq minutes pour vérifier qu'il sait dire non.
>
>

> **[LIVRABLE]**
>
>
> Le fichier du plan de test, le fichier de comptes, et la capture d'une exécution à un utilisateur montrant le parcours réussi puis le parcours en échec.
>
>

---

## PAGE 55 : ÉTAPE 16 ET ÉTAPE 17



### Étape 16 — Étalonner le protocole



> **[OBJECTIF]**
>
>
> S'assurer que l'instrument mesure le système, et non lui-même.
>
>

#### Travail à faire



* Mesurer ce que l'injecteur seul peut produire, en visant une ressource statique servie par le proxy : c'est son plafond.


* Vérifier que ce plafond est nettement supérieur au débit que vous attendez de l'application.


* Fixer la durée de montée et la durée de plateau, puis les geler pour toutes les campagnes.


* Choisir la suite des paliers, en progression large — par exemple 1, 5, 10, 25, 50, 100 utilisateurs.


* Exécuter deux fois la même campagne sur le même déploiement et comparer : l'écart doit rester faible.



#### Pourquoi cette étape existe



Si l'injecteur sature avant l'application, tous vos paliers suivants mesureront JMeter. Le symptôme est reconnaissable : le débit plafonne à la même valeur sur les deux déploiements, et la charge processeur de l'hôte est élevée alors que celle des services reste modeste.

Le contrôle de répétabilité joue le même rôle sur l'autre plan. Deux exécutions identiques qui diffèrent nettement indiquent que votre poste n'est pas dans un état stable : antivirus, indexation, mises à jour, ou simplement un navigateur resté ouvert.

> **[LIVRABLE]**
>
>
> Un court rapport d'étalonnage : plafond de l'injecteur, paliers retenus, durées, et les deux exécutions de contrôle avec leur écart.
>
>

### Étape 17 — Exécuter les campagnes



> **[OBJECTIF]**
>
>
> Produire deux séries de mesures comparables, une par déploiement.
>
>

#### Travail à faire



* Démarrer un seul déploiement, vérifier qu'il répond, et arrêter l'autre complètement.


* Réinitialiser la base à partir des scripts de peuplement, pour partir du même état à chaque campagne.


* Lancer la campagne en ligne de commande, palier par palier, en conservant le fichier de résultats brut.


* Relever en parallèle les métriques du système sous test, pendant chaque palier.


* Recommencer sur l'autre déploiement, dans les mêmes conditions et dans la même séance.


* Alterner l'ordre lors d'une seconde série, pour vérifier que l'ordre de passage n'influence pas le résultat.



---

## PAGE 56 : ÉTAPE 17 (SUITE) ET ÉTAPE 18



*(Suite de l'Étape 17)* :
La commande d'exécution prend cette forme : on désigne le plan, on nomme le fichier de résultats, et l'on passe le nombre d'utilisateurs en paramètre pour n'avoir qu'un seul plan à maintenir :

```bash
jmeter -n -t plan.jmx -l resultats/vm-50.csv -Jutilisateurs=50
```[cite: 9]

> **[ENCADRÉ : ERREUR FRÉQUENTE]**[cite: 9]
> Ne laissez jamais les deux déploiements en marche pendant une campagne[cite: 9]. Trois machines virtuelles et trois conteneurs actifs simultanément se partagent le processeur et la mémoire du poste : les deux séries seront dégradées, et la comparaison ne mesurera plus que la capacité de votre portable[cite: 9].

> **[CONSEIL]**[cite: 9]
> Conservez les fichiers de résultats bruts dans le dépôt, même volumineux[cite: 9]. Un tableau de synthèse sans les données qui l'ont produit n'est pas vérifiable, et c'est la première chose qu'un correcteur demande quand un chiffre surprend[cite: 9].

> **[LIVRABLE]**[cite: 9]
> Les fichiers de résultats bruts des deux séries, et le relevé des métriques serveur palier par palier[cite: 9].

### Étape 18 — Analyser et comparer[cite: 9]

> **[OBJECTIF]**[cite: 9]
> Établir l'écart, l'expliquer, et dire ce que la mesure ne montre pas[cite: 9].

#### Travail à faire[cite: 9]
* Tracer, pour les deux déploiements, le débit en fonction du nombre d'utilisateurs[cite: 9].
* Tracer de même la latence au 95e centile, et le taux d'erreur[cite: 9].
* Identifier sur chaque courbe le point de saturation, et le nommer[cite: 9].
* Rapprocher ce point des métriques serveur pour désigner le goulot d'étranglement[cite: 9].
* Remplir le tableau de synthèse et rédiger l'analyse[cite: 9].

#### Le tableau de synthèse[cite: 9]

| Grandeur | Trois machines virtuelles | Trois conteneurs |[cite: 9]
|---|---|---|[cite: 9]
| **Débit maximal soutenu** | à relever | à relever |[cite: 9]
| **Charge au point de saturation** | à relever | à relever |[cite: 9]
| **Latence au 95e centile, à charge égale** | à relever | à relever |[cite: 9]
| **Goulot d'étranglement identifié** | à nommer | à nommer |[cite: 9]
| **Temps de démarrage complet** | étape 10 | étape 14 |[cite: 9]
| **Mémoire consommée au repos** | étape 10 | étape 14 |[cite: 9]

---

*(Remarque : La table des matières indique que la suite du document comporte les sections **4. Ce qui vient après** (p. 58), **5. Livrables et organisation** (p. 59), **6. Conduite des séances** (p. 60) et **7. Erreurs les plus fréquentes** (p. 61)[cite: 2]. Vous pourrez m'envoyer ces 4 pages restantes dès que vous le souhaiterez[cite: 2].)*

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
