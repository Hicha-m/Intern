# DEV — APPLICATION TROIS-TIERS



## Consultation de notes



### Déploiement sur trois machines virtuelles



#### Seconde partie — déploiement



L'application réalisée en première partie est maintenant répartie sur trois machines virtuelles VirtualBox, une par couche, reliées par un réseau que vous construisez. Le code ne change pas : seules changent les adresses et la configuration.

---

## Page 19 — Table des matières



**SECONDE PARTIE — DÉPLOIEMENT SUR TROIS MACHINES VIRTUELLES**

1. **Contexte et objectif** (Page 20)


* 1.1 Ce que le déploiement révèle (Page 20)


* 1.2 Prérequis (Page 20)


* 1.3 Contraintes techniques (Page 20)




2. **La topologie cible** (Page 22)


* 2.1 Pourquoi le réseau interne (Page 22)


* 2.2 Plan d'adressage (Page 23)


* 2.3 La règle d'or du déploiement (Page 23)




3. **Déroulement du travail** (Page 24)


* Étape 7 — Préparer les trois machines (Page 24)


* Étape 8 — Réseau et adressage (Page 25)


* Étape 9 — Déployer les trois couches (Page 26)


* Étape 10 — Vérifier et mesurer (Page 27)




4. **Ce qui vient après** (Page 29)


5. **Livrables et organisation** (Page 30)


* 5.1 Récapitulatif des livrables (Page 30)


* 5.2 Organisation du dépôt (Page 30)


* 5.3 Critères d'évaluation (Page 30)




6. **Conduite des séances** (Page 31)


7. **Erreurs les plus fréquentes** (Page 32)



---

## Page 20 — 1. Contexte et objectif



Jusqu'ici, les trois couches s'exécutent sur votre poste, dans trois processus qui se parlent par `localhost`. Cette seconde partie les sépare pour de bon : une machine virtuelle par couche, reliées par un réseau que vous construisez, avec les contraintes d'accès d'une architecture réelle.

C'est l'objet de la partie 1 du cours. Le code ne change pas — et si vous devez le modifier, c'est que l'étape 4 n'a pas été faite correctement. Ce qui change, ce sont trois adresses, quelques fichiers de configuration et une topologie réseau.

### 1.1 Ce que le déploiement révèle



Répartir une application déjà fonctionnelle paraît anodin et ne l'est jamais. Trois hypothèses tacites du développement local tombent d'un coup :

| Hypothèse implicite sur un poste unique | Ce qui en advient une fois réparti |
| --- | --- |
| **Tout est joignable sur localhost** | Chaque service a une adresse distincte, et certaines liaisons sont volontairement impossibles.

 |
| **Un service qui écoute, écoute pour tout le monde** | Un service lié à `127.0.0.1` devient injoignable depuis une autre machine.

 |
| **Le réseau est instantané et infaillible** | Latence, délais d'attente et pannes partielles apparaissent.

 |

> *Note* : La troisième ne se manifestera vraiment qu'en partie 3 du cours, sous charge. Les deux premières vous occuperont dès la première séance.
>
>

### 1.2 Prérequis



Cette partie suppose achevées les six étapes de la première. Trois points en particulier seront mis à l'épreuve immédiatement :

* **Trois processus réellement séparables** : Chaque couche doit pouvoir démarrer seule, sur une machine où les deux autres sont absentes.


* **Configuration externalisée** : Adresses, identifiants et ports viennent de variables d'environnement, jamais du code.


* **Procédure d'installation vérifiée** : Vous allez l'exécuter trois fois, sur trois machines nues. Toute étape implicite se paiera trois fois.



### 1.3 Contraintes techniques



| Élément | Imposé | Laissé libre |
| --- | --- | --- |
| **Hyperviseur** | VirtualBox

 | Version, tant qu'elle est récente

 |
| **Système invité** | Distribution Linux serveur, sans interface graphique

 | Distribution au choix du binôme

 |
| **Nombre de machines** | Trois, une par couche

 | — |
| **Réseau applicatif** | Réseau interne VirtualBox, adressage statique

 | Plan d'adressage

 |
| **Accès extérieur** | Sur la machine du proxy uniquement

 | NAT avec redirection, ou NAT

 |

---

## Page 21 — Contraintes techniques (Suite)



| Élément | Imposé | Laissé libre |
| --- | --- | --- |
| *(Suite)* |  | Network

 |

> ⚠️ **ERREUR FRÉQUENTE**
>
>
> Aucune extension de l'application n'est demandée ici : ni service supplémentaire, ni conteneur. Le but est de déplacer ce qui existe, sans rien y ajouter. Les briques complémentaires seront introduites en partie 2 du cours, avec Docker.
>
>

---

## Page 22 — 2. La topologie cible



### Schéma de la topologie réseau cible



```text
+---------------------------------------------------------------------------------------------------------+
| POSTE DE TRAVAIL — hôte VirtualBox                                                                      |
|                                                                                                         |
|  +-------------------+        8080 -> 80        +-----------------------------------+                   |
|  | Navigateur        |------------------------->| VM 1 — proxy                      |                   |
|  | http://localhost:8080                        | Nginx                             |                   |
|  +-------------------+                          | eth0 : NAT | eth1 : 10.10.10.10    |                   |
|                                                 +-----------------------------------+                   |
|                                                                   | (seule VM joignable depuis l'hôte)  |
|                                                                   | 10.10.10.0/24                       |
|                                                 =====================================                   |
|                                                 Réseau Interne « intnet-app »                           |
|                                                 =====================================                   |
|                                                                   |                                     |
|                                                 +-----------------------------------+                   |
|                                                 | VM 2 — métier                     |                   |
|                                                 | Python (Gunicorn)                 |                   |
|                                                 | eth0 : 10.10.10.20                |                   |
|                                                 +-----------------------------------+                   |
|                                                                   |                                     |
|                                                 +-----------------------------------+                   |
|                                                 | VM 3 — données                    |                   |
|                                                 | PostgreSQL                        | (isolée de l'hôte |
|                                                 | eth0 : 10.10.10.30                |  et d'Internet)   |
|                                                 +-----------------------------------+                   |
|                                                                                                         |
|  . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .  |
|  Redirection de ports NAT sur la VM proxy.                                                              |
|  Le trafic entre par un seul point, et la base n'est accessible que depuis la VM métier.                |
+---------------------------------------------------------------------------------------------------------+

```

*Figure 7 — Les trois machines virtuelles, leur adressage et les deux réseaux.*

Trois machines, deux réseaux. Un réseau interne porte tout le trafic applicatif entre les trois couches ; il est fermé, ni l'hôte ni Internet n'y accèdent. La machine portant le proxy dispose en plus d'un adaptateur en NAT, avec une redirection de ports qui permet à votre navigateur de l'atteindre.

Ce découpage reproduit à l'échelle du poste de travail une architecture de production courante : une façade exposée, un segment applicatif privé, et une base de données que rien n'atteint depuis l'extérieur.

### 2.1 Pourquoi le réseau interne



VirtualBox propose cinq modes réseau, dont trois auraient pu convenir techniquement. Le réseau interne est retenu pour une raison précise : il est le seul à interdire aussi l'accès depuis l'hôte.

| Mode | VM ↔ VM | Hôte → VM | Pourquoi il est écarté, ou retenu |
| --- | --- | --- | --- |
| **NAT** | non | redirection | Les machines ne se voient pas : inutile ici.

 |
| **Accès par pont** | oui | oui | Les trois machines seraient exposées au réseau local.

 |
| **Réseau privé hôte** | oui | oui | L'hôte joint la base : l'isolation n'est pas démontrable.

 |
| **Réseau interne** | **oui** | **non** | **Retenu — segment strictement privé entre machines**.

 |

> 📌 **À RETENIR**
>
>
> C'est ce choix qui rend possible la vérification négative de l'étape 10 : si votre poste arrive à joindre la base, la topologie est fausse. Avec un réseau privé hôte, ce test n'aurait aucun sens.
>
>

---

## Page 23 — 2.2 Plan d'adressage & 2.3 La règle d'or



### 2.2 Plan d'adressage



| Machine | Rôle | vCPU / RAM | Adaptateur 1 | Adaptateur 2 |
| --- | --- | --- | --- | --- |
| **vm-proxy** | Nginx, sert le client | 1 / 1 Go

 | NAT (8080 → 80)

 | interne 10.10.10.10

 |
| **vm-metier** | API Python | 2 / 2 Go

 | interne 10.10.10.20

 | — |
| **vm-donnees** | PostgreSQL | 2 / 2 Go

 | interne 10.10.10.30

 | — |

Le sous-réseau `10.10.10.0/24` et le nom de réseau `intnet-app` sont des suggestions : tout autre plan convient, pourvu qu'il soit écrit avant d'être mis en œuvre et qu'il figure au compte rendu.

### 2.3 La règle d'or du déploiement



Un seul point d'entrée. Le trafic venu de l'extérieur n'atteint que la machine du proxy ; tout le reste se passe à l'intérieur du réseau interne. Cette règle a trois conséquences immédiates, qui seront vérifiées une à une à l'étape 10 :

* Le navigateur n'adresse jamais la couche métier directement : il passe par le proxy.


* La couche métier est la seule à ouvrir une connexion à la base.


* Aucun service, hormis le proxy, n'est joignable depuis votre poste.



> La règle d'or du chapitre 2 de la première partie — *le client ne parle jamais à la base* — trouve ici sa traduction matérielle : ce n'est plus une convention de programmation, c'est une impossibilité de réseau.
>
>

---

## Page 24 — 3. Déroulement du travail



```text
+-----------------+      +---------------------+      +------------------------+      +-----------------------+
| Trois machines  |----->| Réseau et adressage |----->| Déploiement des couches|----->| Vérification et mesure|
+-----------------+      +---------------------+      +------------------------+      +-----------------------+
     Étape 7                    Étape 8                        Étape 9                         Étape 10

```

*Les étapes 1 à 6 sont celles de la première partie : elles doivent être achevées.*


*Figure 8 — Les quatre étapes du déploiement.*

Quatre étapes, dans cet ordre : chacune se vérifie avant que la suivante ne commence. Prenez un snapshot au début de chaque étape ; c'est ce qui vous permettra d'essayer plutôt que d'éviter.

---

### Étape 7 — Préparer les trois machines



> 🎯 **OBJECTIF**
>
>
> Obtenir trois machines virtuelles distinctes, à partir d'une seule installation.
>
>

#### Travail à faire



* Partir de la machine du TP 1, à jour et sans données de projet, et en faire un modèle : c'est le socle commun.


* La cloner trois fois en clone intégral, en cochant la réinitialisation des adresses MAC de toutes les cartes réseau.


* Sur chaque clone, fixer le nom de machine dans `/etc/hostname` et `/etc/hosts`, puis régénérer l'identifiant de machine.


* Ajuster les ressources de chaque machine conformément au plan d'adressage : inutile de donner deux processeurs au proxy.


* Prendre sur chacune un snapshot nommé « base propre », avant toute configuration.



#### Deux détails qui coûtent une séance si on les ignore



Un clone conserve l'adresse MAC de son modèle. Deux machines ayant la même adresse sur le même réseau produisent un comportement erratique, difficile à diagnostiquer parce qu'il ressemble à une panne intermittente. L'option de réinitialisation, au moment du clonage, évite tout cela.

De même, l'identifiant de machine est copié. Sur les distributions récentes, c'est lui qui sert d'identifiant au client DHCP : trois machines clonées demandent alors la même adresse. La régénération tient en deux commandes :

```bash
sudo truncate -s 0 /etc/machine-id
sudo systemd-machine-id-setup && sudo reboot
```[cite: 7]

> 💡 **CONSEIL**[cite: 7]
> Le snapshot « base propre » est votre filet[cite: 7]. Chaque étape suivante modifie la configuration réseau ou système ; pouvoir revenir en trente secondes à une machine saine change complètement le rapport au risque, et vous fera essayer des choses plutôt que les éviter[cite: 7].

---

## Page 25 — Étape 7 (Livrables) & Étape 8[cite: 9]

> 📦 **LIVRABLE (Étape 7)**[cite: 9]
> Trois machines nommées, dimensionnées, chacune avec son snapshot initial[cite: 9]. Une capture de la liste des machines dans VirtualBox suffit à l'attester[cite: 9].

---

### Étape 8 — Réseau et adressage[cite: 9]

> 🎯 **OBJECTIF**[cite: 9]
> Construire le réseau interne, fixer les adresses, et vérifier la connectivité avant tout déploiement[cite: 9].

#### Travail à faire[cite: 9]
* Sur les trois machines, placer l'adaptateur applicatif en réseau interne, avec le même nom de réseau — par exemple `intnet-app`[cite: 9].
* Sur la machine du proxy uniquement, activer un second adaptateur en NAT et y déclarer une redirection du port 8080 de l'hôte vers le port 80 de la machine[cite: 9].
* Attribuer une adresse statique à chaque machine sur le réseau interne, selon le plan retenu[cite: 9].
* Vérifier, avant d'aller plus loin, que chaque machine en joint les deux autres[cite: 9].

#### Adressage statique[cite: 9]
Un réseau interne ne comporte aucun serveur DHCP : sans configuration, les machines n'obtiennent aucune adresse[cite: 9]. Sur une distribution récente utilisant Netplan, le fichier tient en quelques lignes[cite: 9] :

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: false
      addresses: [10.10.10.20/24]
```[cite: 9]

*Le nom de l'interface varie d'une machine à l'autre : relevez-le avec `ip a` avant d'écrire le fichier, ne le devinez pas[cite: 9].*

#### Le problème de l'installation des paquets[cite: 9]
Les machines métier et données n'ont aucun accès à Internet, ce qui est précisément l'objectif — mais vous devez y installer PostgreSQL et des bibliothèques Python[cite: 9]. Deux façons de procéder, et le choix mérite d'être assumé dans le compte rendu[cite: 9] :

* **Installer avant d'isoler** : Poser tous les paquets pendant que la machine a encore un adaptateur NAT, puis le désactiver[cite: 9]. Simple, et c'est ce que fait une image de base en production[cite: 9].
* **Isoler puis ouvrir ponctuellement** : Garder un adaptateur NAT désactivé, l'activer le temps d'une installation, le désactiver ensuite[cite: 9]. Plus proche d'une pratique d'exploitation réelle[cite: 9].

> ⚠️ **ERREUR FRÉQUENTE**[cite: 9]
> Ce qu'il ne faut pas faire : laisser l'adaptateur NAT actif sur les trois machines « pour la commodité »[cite: 9]. La topologie n'est alors plus celle qui est demandée, la vérification négative de l'étape 10 réussira à tort, et le déploiement en conteneurs de la partie 2 du cours n'aura plus rien à quoi se comparer[cite: 9].

---

## Page 26 — Étape 8 (Suite) & Étape 9[cite: 8]

#### Vérification (Étape 8)[cite: 8]

```bash
ip a                      # l'adresse est-elle bien posée ?
ping -c2 10.10.10.30      # depuis vm-metier vers vm-donnees
ping -c2 10.10.10.20      # depuis vm-proxy vers vm-metier
```[cite: 8]

> 📦 **LIVRABLE (Étape 8)**[cite: 8]
> Le plan d'adressage, les trois fichiers de configuration réseau, et la sortie des commandes de vérification[cite: 8].

---

### Étape 9 — Déployer les trois couches[cite: 8]

> 🎯 **OBJECTIF**[cite: 8]
> Installer chaque couche sur sa machine, en ne changeant que la configuration[cite: 8].

L'ordre est imposé par les dépendances : la base d'abord, le métier ensuite, le proxy en dernier[cite: 8]. Prenez un snapshot avant chaque couche[cite: 8].

#### 1. `vm-donnees` — la base[cite: 8]
* Installer le SGBD, créer la base, l'utilisateur applicatif et ses droits, puis exécuter vos deux scripts SQL[cite: 8].
* Faire écouter le serveur sur l'adresse du réseau interne et non sur la seule boucle locale[cite: 8].
* N'autoriser les connexions que depuis l'adresse de la machine métier, et en exigeant un mot de passe[cite: 8].

*Sous PostgreSQL, cela revient à deux fichiers. Dans `postgresql.conf` :*[cite: 8]
```text
listen_addresses = '10.10.10.30'
```[cite: 8]
*et dans `pg_hba.conf`, une ligne qui n'ouvre l'accès qu'à la machine métier :*[cite: 8]
```text
host  notes  app  10.10.10.20/32  scram-sha-256
```[cite: 8]

#### 2. `vm-metier` — l'application[cite: 8]
* Installer Python et les dépendances, déployer le code, créer l'environnement virtuel[cite: 8].
* Renseigner les variables d'environnement — adresse et identifiants de la base — hors du code[cite: 8].
* Lancer le serveur applicatif en écoutant sur l'adresse du réseau interne, et non sur la boucle locale[cite: 8].
* Déclarer le tout comme un service géré par le système, de sorte qu'il redémarre avec la machine[cite: 8].

```bash
gunicorn --bind 10.10.10.20:8000 app:application
```[cite: 8]

> Le passage par un service système n'est pas un raffinement : une application lancée à la main dans un terminal disparaît à la fermeture de la session, et vous perdrez du temps à comprendre pourquoi tout s'arrête après un redémarrage[cite: 8].

#### 3. `vm-proxy` — la façade[cite: 8]
* Installer le serveur web, y déposer les fichiers du client[cite: 8].
* Configurer le renvoi des appels de l'interface applicative vers la machine métier[cite: 8].
* Vérifier que le client, côté navigateur, s'adresse bien au proxy et jamais directement au métier[cite: 8].

```nginx
location /api/ { proxy_pass http://10.10.10.20:8000/api/; }
```[cite: 8]

---

## Page 27 — Étape 9 (Livrables) & Étape 10[cite: 10]

> 📌 **À RETENIR**[cite: 10]
> C'est ici que l'externalisation de la configuration, demandée à l'étape 4, se rentabilise[cite: 10]. Si vous n'avez aucune ligne de code à modifier pour ce déploiement, l'étape 4 a été bien faite[cite: 10]. Sinon, notez dans votre compte rendu ce qu'il a fallu changer : c'est un résultat d'expérience, pas un aveu[cite: 10].

> 📦 **LIVRABLE (Étape 9)**[cite: 10]
> Les fichiers de configuration des trois machines — réseau, base, service applicatif, serveur web — rassemblés dans le dépôt, et la procédure de déploiement mise à jour[cite: 10].

---

### Étape 10 — Vérifier et mesurer[cite: 10]

> 🎯 **OBJECTIF**[cite: 10]
> Établir que la topologie est celle qui était demandée, et relever les mesures de référence[cite: 10].

#### La matrice de joignabilité[cite: 10]
La vérification positive ne suffit pas : une application qui fonctionne peut être mal isolée[cite: 10]. Il faut donc vérifier aussi ce qui doit échouer[cite: 10]. Le tableau ci-dessous est à reproduire et à remplir[cite: 10] :

| Depuis | vers proxy :80 | vers métier :8000 | vers base :5432 |
| :--- | :---: | :---: | :---: |
| **L'hôte** | oui, via 8080[cite: 10] | doit échouer[cite: 10] | doit échouer[cite: 10] |
| **vm-proxy** | — | oui[cite: 10] | doit échouer[cite: 10] |
| **vm-metier** | oui[cite: 10] | — | oui[cite: 10] |
| **vm-donnees** | oui[cite: 10] | oui[cite: 10] | — |

Les trois cases « doit échouer » sont les plus instructives[cite: 10]. Si l'une réussit, la cause est presque toujours l'une des trois suivantes : un adaptateur NAT resté actif, un service qui écoute sur toutes les interfaces alors qu'il ne le devrait pas, ou une règle de filtrage absente[cite: 10].

#### Les commandes utiles[cite: 10]

```bash
ss -tlnp                            # sur quelles adresses ce service écoute-t-il ?
curl -s -o /dev/null -w '%{http_code}' http://10.10.10.20:8000/api/...
psql -h 10.10.10.30 -U app notes -c 'select 1'
nc -zv -w2 10.10.10.30 5432          # depuis l'hôte : doit échouer
```[cite: 10]

> ⚠️ **ERREUR FRÉQUENTE**[cite: 10]
> Un service qui écoute sur `0.0.0.0` écoute sur toutes les interfaces de la machine, y compris celles que la topologie destinait à rester privées[cite: 10]. La configuration réseau de l'hyperviseur ne compense pas une écoute trop large côté service : c'est `ss -tlnp`, et non le succès de l'application, qui vous dira la vérité[cite: 10].

#### Les mesures de référence[cite: 10]
Ces relevés seront rejoués à l'identique sur les conteneurs, en partie 2 du cours[cite: 10]. Leur valeur tient entièrement à la rigueur du protocole : trois exécutions, médiane retenue, configuration exacte consignée à côté de chaque chiffre[cite: 10].

## Page 28 — Tableau des mesures de référence

| Grandeur | Comment la relever | Pourquoi elle compte |
| --- | --- | --- |
| **Temps de démarrage** | Des trois machines éteintes au service qui répond | C'est l'écart le plus spectaculaire avec les conteneurs |
| **Mémoire consommée** | Côté hôte, les trois machines en marche au repos | Mesure le coût des trois systèmes d'exploitation |
| **Empreinte disque** | Taille cumulée des fichiers de disque | Même raison, sur l'autre ressource |
| **Latence applicative** | Dix appels à une route de consultation | Point de comparaison sous charge en partie 3 |

> 💡 **CONSEIL**
> Relevez aussi le temps qu'il vous a fallu pour passer de zéro aux trois machines opérationnelles. Ce n'est pas une mesure technique, mais c'est celle qui frappera le plus quand vous ferez la même chose en conteneurs, en quelques minutes.

> 📦 **LIVRABLE (Fin Étape 10)**
> La matrice de joignabilité remplie, les sorties de commandes qui l'attestent, le tableau des mesures de référence, et les trois machines exportées au format OVA.

---

## Page 29 — 4. Ce qui vient après

Le déploiement réparti clôt la partie 1 du cours. L'application que vous venez de séparer sera reprise deux fois, et il est utile de savoir dès maintenant ce que ces reprises exigeront.

| Suite | Ce qui sera fait | Ce que cela exige dès maintenant |
| --- | --- | --- |
| **Partie 2 du cours** | Le même découpage, repris en trois conteneurs Docker | Une procédure de déploiement exacte, suivie trois fois et vérifiée |
| **Partie 2 (extension)** | Intégration de briques open source non écrites par vous | Des interfaces stables entre vos trois couches |
| **Partie 3 du cours** | Injection de charge avec JMeter, comparaison des deux déploiements | Les mesures de référence de l'étape 10, et un jeu de données suffisant |

> 📌 **À RETENIR**
> La comparaison de la partie 3 n'a de sens que si les deux déploiements hébergent la même application, avec le même jeu de données et le même protocole de mesure. C'est pourquoi les relevés de l'étape 10 doivent être consignés avec leur configuration, et non seulement leurs chiffres.

---

## Page 30 — 5. Livrables et organisation

### 5.1 Récapitulatif des livrables

| Étape | Livrable | Forme |
| --- | --- | --- |
| **7** | Trois machines préparées | Capture VirtualBox + snapshots nommés |
| **8** | Réseau interne et adressage | Plan d'adressage + trois fichiers réseau |
| **9** | Déploiement réparti | Fichiers de configuration des trois machines |
| **10** | Vérification et mesures | Matrice de joignabilité, mesures, trois OVA |

### 5.2 Organisation du dépôt

Le dépôt de la première partie est complété d'un dossier dédié au déploiement. Rien n'est déplacé : le code reste où il est.

```text
deploiement/
├── reseau/         netplan des trois machines
├── donnees/        postgresql.conf, pg_hba.conf
├── metier/         unité systemd, fichier d'environnement
├── proxy/          configuration Nginx
├── PROCEDURE.md    déploiement pas à pas, dans l'ordre
└── docs/
    └── mesures.md  relevés de l'étape 10 et leur configuration

```

Le fichier de procédure est le livrable le plus utile de cette partie : c'est lui que vous relirez en partie 2 du cours pour écrire les fichiers Docker, et lui qui révélera les étapes que vous faisiez « de mémoire ».

### 5.3 Critères d'évaluation

| Critère | Ce qui est regardé | Poids |
| --- | --- | --- |
| **Préparation des machines** | Clones propres, nommage, dimensionnement, snapshots | **15 %** |
| **Topologie et adressage** | Conformité au plan, réseau interne correctement fermé | **25 %** |
| **Déploiement des trois couches** | Écoute sur les bonnes adresses, services système, aucun code modifié | **30 %** |
| **Vérification de l'isolation** | Matrice remplie, cas négatifs réellement testés | **20 %** |
| **Mesures et compte rendu** | Protocole respecté, configuration consignée | **10 %** |

*Les deux parties du document sont évaluées séparément ; leur pondération respective est annoncée en séance. Notez le poids du critère d'isolation : un déploiement qui fonctionne mais dont l'hôte joint la base ne remplit pas l'objectif de cette partie.*

---

## Page 31 — 6. Conduite des séances

Le déploiement se mène en deux séances de quatre heures. La répartition ci-dessous est indicative, mais l'ordre ne l'est pas.

| Séance | Ce qui doit être atteint | Point de contrôle |
| --- | --- | --- |
| **Première** | Étapes 7 et 8 : trois machines, réseau interne, adressage | Chaque machine en joint les deux autres |
| **Seconde** | Étapes 9 et 10 : déploiement, vérification, mesures | La matrice de joignabilité est remplie |

Ne commencez pas l'étape 9 si l'étape 8 n'est pas vérifiée. Déployer trois services sur un réseau qui ne fonctionne pas produit un enchevêtrement de symptômes où l'on ne sait plus si la panne vient du réseau, de la configuration ou de l'application.

> 💡 **CONSEIL**
> Consignez au fil de l'eau, pas à la fin. Les commandes exactes, les messages d'erreur rencontrés et ce qui les a résolus constituent la matière du fichier de procédure. Reconstitués de mémoire trois jours plus tard, ils seront faux.

---

## Page 32 — 7. Erreurs les plus fréquentes

Ces sept situations concentrent l'essentiel du temps perdu sur cette partie. Le symptôme est plus utile que la cause : c'est par lui que vous entrerez dans le diagnostic.

| Symptôme observé | Cause la plus probable |
| --- | --- |
| **Connectivité erratique entre deux machines** | Clonage sans réinitialisation des adresses MAC |
| **Deux machines obtiennent la même adresse** | Identifiant de machine identique (hérité du clone) |
| **Aucune adresse sur le réseau interne** | Attente d'un DHCP qui n'existe pas sur ce mode |
| **Le métier ne joint pas la base, sans message clair** | `listen_addresses` resté sur la boucle locale |
| **Connexion refusée avec un message d'authentification** | Ligne manquante dans `pg_hba.conf` |
| **Le proxy renvoie une erreur 502** | Service métier arrêté, ou lié à `127.0.0.1` |
| **Tout marche, mais l'hôte joint aussi la base** | Adaptateur NAT resté actif sur `vm-donnees` |


> 📌 **À RETENIR**
> Diagnostiquez de bas en haut : l'adresse est-elle posée, la machine répond-elle au ping, le port est-il ouvert, le service écoute-t-il sur la bonne adresse, l'application répond-elle. Remonter cette chaîne dans l'ordre prend cinq minutes ; la parcourir au hasard peut prendre une séance.
