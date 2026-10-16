# DEV - APPLICATION TROIS-TIERS

## Consultation de notes

**Prototypage sous Figma, puis réalisation en trois couches**

**Cahier des charges et déroulement du travail**

*Application développée en binôme, puis déployée sur machines virtuelles (partie 1), en conteneurs (partie 2) et soumise à une injection de charge (partie 3).*

**Auteur :** Mohamed Quafafou

**Établissement :** Aix-Marseille Université - École d'ingénieurs

**Année universitaire :** 2025-2026

---

## Page 2 : Table des matières

### Table des matières

1. **Contexte et objectif** | *Page 3*
* 1.1 Contraintes techniques | *Page 3*
* 1.2 Périmètre fonctionnel | *Page 3*
* 1.3 Règles de gestion | *Page 4*


2. **Le scénario d'échange à réaliser** | *Page 5*
* 2.1 Lecture du scénario | *Page 5*
* 2.2 Interface applicative suggérée | *Page 6*


3. **Déroulement du travail** | *Page 7*
* Étape 1 - Analyse | *Page 7*
* Étape 2 - Prototype Figma | *Page 7*
* Étape 3 - Couche données | *Page 10*
* Étape 4 - Couche métier | *Page 11*
* Étape 5 - Couche présentation | *Page 12*
* Étape 6 - Intégration et tests | *Page 12*


4. **Ce qui vient après** | *Page 14*
5. **Livrables et organisation** | *Page 15*
* 5.1 Récapitulatif des livrables | *Page 15*
* 5.2 Organisation du dépôt | *Page 15*
* 5.3 Critères d'évaluation | *Page 15*


6. **Calendrier et suivi** | *Page 16*
7. **Erreurs les plus fréquentes** | *Page 17*

---

## Page 3 : Contexte, architecture et contraintes techniques

### 1. Contexte et objectif

Le projet consiste à concevoir et développer une application Web d'architecture trois-tiers dédiée à la consultation et à la gestion de notes de cours pour une école d'ingénieurs.

```
+-------------------+       +-------------------+       +-------------------+
|   Présentation    | ----> |      Métier       | ----> |      Données      |
|  (Client Browser) |       |   (API Python)    |       |  (Base de données)|
+-------------------+       +-------------------+       +-------------------+

```

#### 1.1 Contraintes techniques

| Couche | Technologie suggérée / requise | Rôle & Spécificités |
| --- | --- | --- |
| **Présentation** | HTML / CSS / JavaScript (Vanilla ou Framework) | Interface utilisateur web responsive |
| **Métier** | Python (Flask / FastAPI) | Logique applicative, contrôle d'accès, API REST |
| **Données** | SGBD Relationnel (PostgreSQL / MySQL / SQLite) | Stockage persistant et règles d'intégrité SQL |

> 💡 **CONSEIL**
> L'application doit fonctionner sur la machine locale, sans installation complexe. Le choix des technologies est libre tant que l'architecture trois-tiers est strictement respectée et que la séparation des couches est effective.

#### 1.2 Périmètre fonctionnel

L'application s'adresse à trois catégories d'utilisateurs distinctes :

* **Étudiant :** Connexion à son espace personalisé, consultation de ses propres notes de cours et détails associés.
* **Enseignant :** Connexion, affichage de la liste des cours qu'il enseigne, consultation et saisie des notes pour les étudiants inscrits à ses cours.
* **Superviseur :** Administration, validation des demandes de création de comptes utilisateurs en attente.

---

## Page 4 : Périmètre fonctionnel (suite) & Règles de gestion

#### 1.2 Périmètre fonctionnel (suite)

> 📌 **DROITS D'ACCÈS ET RÔLES**
> * **Étudiant :** Ne peut voir que ses propres notes. Il ne connaît pas et n'accède jamais aux notes des autres étudiants.
> * **Enseignant :** Accède uniquement aux cours dont il est le responsable/propriétaire. Il ne peut ni consulter ni modifier les notes d'un cours assuré par un collègue.
> * **Superviseur :** Valide ou rejette les demandes d'inscription. Un compte non validé ne peut pas se connecter à l'application.
>
>

#### 1.3 Règles de gestion

Les règles métier suivantes doivent être obligatoirement garanties par la base de données et la couche métier :

* **R1 :** Un cours est assuré par un et un seul enseignant.
* **R2 :** Un enseignant peut assurer plusieurs cours.
* **R3 :** Un étudiant peut avoir plusieurs notes dans un même cours.
* **R4 :** Une note concerne un seul étudiant et un seul cours (paire unique d'identifiants).
* **R5 :** Un compte utilisateur possède un `login` unique dans tout le système.
* **R6 :** Un nouveau compte créé est placé par défaut au statut *« en attente de validation »* par le superviseur avant de devenir actif.

---

## Page 5 : Le scénario d'échange à réaliser

### 2. Le scénario d'échange à réaliser

```
[ Client ]                   [ Métier (API) ]               [ Données (DB) ]
    |                              |                              |
    |---- (1) Connexion ---------->|                              |
    |                              |---- (2) Requête SQL -------->|
    |                              |<--- (3) Résultat SQL --------|
    |<--- (4) Session / Jeton -----|                              |
    |                              |                              |
    |---- (5) Consultation ------->|                              |
    |                              |---- (6) Requête SQL -------->|
    |                              |<--- (7) Données brut --------|
    |<--- (8) Réponse JSON --------|                              |

```

#### 2.1 Lecture du scénario

L'enchaînement des 8 étapes représente le cycle de vie standard d'une requête client :

1. Le client envoie ses identifiants de connexion (`login` et `password`).
2. La couche métier interroge la base de données pour vérifier l'existence du compte et l'empreinte du mot de passe.
3. La base renvoie les données de l'utilisateur (rôle, statut).
4. La couche métier génère et retourne un cookie de session ou un jeton de connexion si l'authentification est valide.
5. Le client demande une ressource protégée (ex: ses notes ou ses cours) en joignant son jeton/cookie.
6. La couche métier vérifie les autorisations et effectue la requête SQL adaptée.
7. La base de données retourne les données.
8. La couche métier formate les données au format JSON et les envoie au client.

---

## Page 6 : Interface applicative suggérée

> ⚠️ **ERREUR FRÉQUENTE**
> L'erreur la plus fréquente consiste à faire porter au client la logique de décision – par exemple, laisser le client demander `GET /api/notes?id=12`. Le serveur doit déterminer lui-même de quel étudiant il s'agit à partir de la session active. Sans cette précaution, n'importe quel étudiant peut consulter les notes d'un autre en modifiant l'identifiant dans l'URL.

#### 2.2 Interface applicative suggérée

| Étape | Route suggérée | Rôle requis | Action / Description |
| --- | --- | --- | --- |
| (1)-(4) | `POST /api/connexion` | *Aucun* | Authentification de l'utilisateur |
| (1)-(4) | `POST /api/inscription` | *Aucun* | Création d'un compte (statut en attente) |
| (5)-(8) | `GET /api/mes-notes` | **Étudiant** | Récupération des notes de l'étudiant connecté |
| (5)-(8) | `GET /api/mes-cours` | **Enseignant** | Liste des cours dispensés par l'enseignant |
| (5)-(8) | `GET /api/cours/[id]/notes` | **Enseignant propriétaire** | Consultation des notes d'un de ses cours |
| Validation | `GET` & `POST /api/comptes-en-attente` | **Superviseur** | Consultation et validation des comptes |

> 💡 **CONSEIL**
> Remarquez la formulation de la dernière colonne pour la route des notes d'un cours : *« enseignant propriétaire du cours »*, et non simplement *« enseignant »*. Un enseignant ne doit pas pouvoir consulter les notes d'un cours qu'il n'assure pas. Ce contrôle se code en une ligne, et son absence est systématiquement relevée à la soutenance.

---

## Page 7 : Déroulement du travail - Étape 1 : Analyse

### 3. Déroulement du travail

```
+-----------+     +-------------------+     +-----------+     +--------------+     +-----------+     +--------------------+
|  Étape 1  | --> |      Étape 2      | --> |  Étape 3  | --> |   Étape 4    | --> |  Étape 5  | --> |      Étape 6       |
|  Analyse  |     |  Prototype Figma  |     |  Données  |     | Métier (API) |     |  Client   |     | Intégration/Tests  |
+-----------+     +-------------------+     +-----------+     +--------------+     +-----------+     +--------------------+
                       ^ (Jalon de validation)

```

*Figure 3 – Les six étapes du projet. L'étape 2 constitue le jalon de validation.*

Le projet se déroule en six étapes. L'ordre n'est pas indicatif : chaque étape produit ce dont la suivante a besoin. En particulier, **aucun code ne doit être écrit avant la validation du prototype**.

---

### Étape 1 - Analyse

**OBJECTIF :** Établir sans ambiguïté qui fait quoi et avec quelles données, avant toute décision technique.

#### Travail à faire :

1. Recenser les acteurs et, pour chacun, la liste des actions qu'il peut effectuer.
2. Rédiger les cas d'usage sous une forme homogène : *acteur, déclencheur, enchaînement nominal, cas d'erreur*.
3. Lister les cas d'erreur explicitement : identifiant inconnu, mot de passe erroné, compte en attente de validation, enseignant sans cours, étudiant sans note, cours sans étudiant inscrit.
4. Reprendre les six règles de gestion et vérifier qu'aucune n'est contredite par les cas d'usage.

> 💡 **CONSEIL**
> Les cas où il n'y a rien à afficher (un enseignant qui n'assure aucun cours, un étudiant sans note) sont ceux qu'on oublie de traiter, et ceux que l'examinateur essaie en premier. Décidez dès maintenant du message affiché dans chacun de ces cas.

📄 **LIVRABLE :** Un document de 2 à 4 pages décrivant les acteurs, les cas d'usage, les cas d'erreur et la matrice des règles de gestion.

---

## Page 8 : Étape 2 : Prototype Figma

### Étape 2 - Prototype Figma

**OBJECTIF :** Valider les écrans et l'enchaînement de l'application avant d'écrire la moindre ligne de code. Cette étape constitue le jalon de validation du projet. Le passage à l'étape suivante est conditionné à l'approbation du prototype.

```
                      +-------------------+
                      |   E1 - Connexion  |
                      | login / mdp / err |
                      +-------------------+
                        /       |       \
            (étudiant) /        |        \ (enseignant)
                      v         |         v
  +-----------------------+     |     +--------------------+       +--------------------+
  |  E3 - Notes étudiant  |     |     |   E4 - Mes cours   | ----> | E5 - Notes du cours|
  |   cours / note / date |     |     |  liste enseignants | (clic)|  étudiants & notes |
  +-----------------------+     |     +--------------------+       +--------------------+
                                |
                   (superviseur)|     +--------------------+
                                +---> |   E6 - Validation  |
                                      |  écran superviseur |
                                      +--------------------+
                                                ^
  +-----------------------+                     |
  |   E2 - Inscription    | --------------------+
  |   demande de compte   |   (compte non validé)
  +-----------------------+

```

*Figure 4 – Carte des écrans et enchaînement attendu.*

#### Travail à faire :

* Maquetter les six écrans de la figure ci-dessus.
* Rendre le prototype cliquable : depuis l'écran de connexion, on doit pouvoir atteindre chacun des écrans terminaux.
* Maquetter également les états dégradés : erreur d'authentification, compte en attente, liste vide.
* Faire figurer sur chaque écran des données plausibles (pas de "Lorem Ipsum").
* Construire l'**Écran zéro** pour permettre la revue complète.

#### Points de vigilance :

* Un prototype est une **spécification** : toute colonne, bouton ou calcul dessiné devra être fonctionnel dans le code final.
* Réciproquement, toute fonction décrite au cahier des charges doit posséder un écran ou élément visuel associé.

#### Simuler ce qui n'existe pas encore :

1. **Sélecteur de démonstration :** Un composant externe *« Se connecter en tant que... »*.
2. **Comptes de démonstration :** Vignettes cliquables au bas de l'écran d'accueil.
3. **Variables Figma :** Gestion dynamique du rôle par variables conditionnelles.

---

## Page 9 : L'Écran zéro (Sommaire du prototype)

> ⚠️ **ERREUR FRÉQUENTE**
> Le sélecteur de démonstration du prototype et un sélecteur de rôle dans l'application se ressemblent à l'écran. Annotez clairement l'écran E1 : **le rôle est déterminé par le serveur à partir du compte**.

```
+---------------------------------------------------------------------------------------------------+
| PROTOTYPE - CONSULTATION DE NOTES                                                                 |
| Écran zéro - sommaire du prototype                                    [ Hors maquette produit ]   |
|                                                                                                   |
| A - Parcours à dérouler                                                                           |
| +-------------------------+     +-------------------------+     +-------------------------------+ |
| | Parcours étudiant       |     | Parcours enseignant     |     | Parcours superviseur          | |
| | E1 -> E3                |     | E1 -> E4 -> E5          |     | E1 -> E6                      | |
| | (connexion, mes notes)  |     | (connexion, cours, notes|     | (connexion, validation)       | |
| +-------------------------+     +-------------------------+     +-------------------------------+ |
|                                                                                                   |
| B - Tous les écrans                                                                               |
| +----+   +----+   +----+   +----+   +----+   +----+                                               |
| | E1 |   | E2 |   | E3 |   | E4 |   | E5 |   | E6 |                                               |
| +----+   +----+   +----+   +----+   +----+   +----+                                               |
|                                                                                                   |
| C - États dégradés                                                                                |
| +------------------------+  +------------------------+  +---------------------------------------+ |
| | Identifiant inconnu    |  | Mot de passe erroné    |  | Compte en attente (E1)                | |
| +------------------------+  +------------------------+  +---------------------------------------+ |
| +------------------------+  +------------------------+  +---------------------------------------+ |
| | Enseignant sans cours  |  | Étudiant sans note     |  | Cours sans inscrit (E5)               | |
| +------------------------+  +------------------------+  +---------------------------------------+ |
|                                                                                                   |
| Règle : tout écran dessiné doit être accessible. Un lien discret "Écran zéro" figure sur chaque  |
| frame.                                                            Binôme : Nom1 / Nom2 - v3 09/09 |
+---------------------------------------------------------------------------------------------------+

```

*Figure 5 – Vue détaillée de l'écran zéro.*

📄 **LIVRABLE DE L'ÉTAPE 2 :** Lien du prototype Figma (accès lecture) + capture d'écran de l'Écran zéro.

---

## Page 10 : Étape 3 : Couche données

### Étape 3 - Couche données

**OBJECTIF :** Disposer d'une base de données peuplée dont le schéma garantit par lui-même l'intégrité des données et les règles métier.

```
+------------------------+
|        COMPTE          |
+------------------------+
| # id_compte            |
|   login (unique)       |
|   mot_de_passe_hash    |
|   role                 |
|   statut               |
| * id_personne          |
+------------------------+

```

`* Un compte pointe vers un enseignant ou un étudiant selon son rôle.`

```
+------------------------+                             +------------------------+
|       ENSEIGNANT       |                             |        ETUDIANT        |
+------------------------+                             +------------------------+
| # id_enseignant        |                             | # id_etudiant          |
|   nom                  |                             |   nom                  |
|   prenom               |                             |   prenom               |
|   email                |                             |   email                |
+------------------------+                             +------------------------+
            |                                                      |
            | assure (1,1 - 0,n)                                   | obtient (0,n)
            v                                                      v
+------------------------+                             +------------------------+
|         COURS          | --------------------------> |          NOTE          |
+------------------------+                             +------------------------+
| # id_cours             |                             | # id_etudiant          |
|   code (unique)        |                             | # id_cours             |
|   intitule             |                             |   valeur               |
| * id_enseignant        |                             |   date_saisie          |
+------------------------+                             +------------------------+

```

*Figure 6 – Schéma relationnel de la base de données.*

#### Travail à faire :

1. Écrire le script SQL de création des tables (`schema.sql`) avec clés primaires, clés étrangères et contraintes (`UNIQUE`, `NOT NULL`).
2. Implémenter les règles de gestion (R1 via FK non nulle, R4 via clé primaire composée `(id_etudiant, id_cours)`, R5 via contrainte unique sur le login).
3. Rédiger le script de peuplement (`data.sql`) : au moins **3 enseignants, 6 cours, 20 étudiants** et leurs notes.
4. Inclure les cas limites : enseignant sans cours, étudiant sans note, cours sans inscrit, compte non validé.
5. Tester les requêtes SQL de consultation directes.

#### Sécurité des mots de passe :

Utilisation obligatoire d'un hachage salé lent (ex: `bcrypt`) :

```python
import bcrypt

# Génération du hachage à l'inscription
empreinte = bcrypt.hashpw(mot_de_passe.encode('utf-8'), bcrypt.gensalt())

# Vérification lors de la connexion
est_valide = bcrypt.checkpw(saisie_utilisateur.encode('utf-8'), empreinte)

```

---

## Page 11 : Étape 4 : Couche métier (API Python)

### Étape 4 - Couche métier

> ⚠️ **ERREUR FRÉQUENTE**
> Ne stockez jamais de mots de passe en clair ou sous forme de SHA-256 basique. Le champ SQL doit se nommer explicitement `mot_de_passe_hash`. Le fichier SQL de test ne doit contenir aucune donnée personnelle réelle.

**OBJECTIF :** Construire une API REST en Python exposant la logique applicative et contrôlant les accès aux données.

#### Travail à faire :

* Structurer le projet Python avec un environnement virtuel (`venv`) et un fichier `requirements.txt`.
* Gérer l'authentification et les sessions (Cookie sécurisé ou Jeton JWT).
* Implémenter les routes HTTP et extraire l'identité de l'utilisateur **uniquement depuis la session serveur**.
* Sécuriser l'accès aux cours : vérifier que l'enseignant connecté est bien le propriétaire du cours interrogé.
* Externaliser la configuration (adresse IP de la BDD, ports, identifiants) dans des variables d'environnement (`.env`).
* Utiliser les bons codes de statut HTTP : `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

```python
import os

# Exemple de lecture d'une variable d'environnement avec valeur par défaut
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')

```

---

## Page 12 : Étape 5 : Couche présentation (Front-End)

> 💡 **CONSEIL**
> Isolez l'accès aux données dans des modules/fonctions d'accès dédiés (DAO/Services). Une route de l'API ne doit pas mélanger le requêtage SQL direct et le contrôle HTTP.

📄 **LIVRABLE DE L'ÉTAPE 4 :** Code source de l'API, fichier de dépendances, et exemples de requêtes d'exécution (fichier `.http` ou commandes `curl`).

---

### Étape 5 - Couche présentation

**OBJECTIF :** Développer l'interface utilisateur web conforme aux maquettes Figma et la raccorder à l'API Métier.

#### Travail à faire :

1. Implémenter les 6 écrans validés lors du jalon Figma.
2. Communiquer exclusivement avec l'API REST Python (aucun accès direct à la base de données).
3. Gérer proprement les états d'attente (loaders) et les messages d'erreur réseau/serveur.
4. Afficher explicitement un message ergonomique en cas de liste vide (*« Aucun cours assigné »*, *« Aucune note enregistrée »*).
5. Rendre l'URL racine de l'API paramétrable via une variable globale de configuration.

> ⚠️ **ERREUR FRÉQUENTE**
> Ne dupliquez pas le contrôle des droits d'accès uniquement côté client (ex: cacher un bouton en JavaScript). Le contrôle de sécurité principal doit impérativement être effectué et vérifié par le serveur.

📄 **LIVRABLE DE L'ÉTAPE 5 :** Code source du client web + une vidéo démonstrative ou des captures d'écran des parcours utilisateur.

---

## Page 13 : Étape 6 : Intégration, tests et documentation

### Étape 6 - Intégration et tests

**OBJECTIF :** Valider le fonctionnement global de l'application et rédiger la documentation d'installation et de recette.

#### Travail à faire :

* Exécuter la recette complète des parcours nominaux sur une base de données réinitialisée.
* Vérifier les cas d'erreur (mauvais mot de passe, tentative d'accès non autorisé à un cours tiers, etc.).
* Tester les failles de sécurité de type modification directe de paramètre dans l'URL.
* Rédiger le cahier de recette sous forme de tableau de tests.
* Rédiger la procédure d'installation pas à pas dans le fichier `README.md`.

#### Format du tableau de tests :

| ID Test | Description / Cas d'usage | Action réalisée | Résultat attendu | Résultat obtenu | Statut |
| --- | --- | --- | --- | --- | --- |
| **T01** | Connexion réussie | Saisie identifiants valides | Redirection vers E3 ou E4 | Redirection OK | **PASS** |
| **T02** | Accès cours non autorisé | Changement de l'ID du cours dans l'URL | Code HTTP 403 Forbidden | Accès refusé 403 | **PASS** |

> 💡 **CONSEIL**
> Testez votre procédure d'installation sur une machine virtuelle vierge avant le rendu final. Toute dépendance manquante sera sanctionnée.

📄 **LIVRABLE DE L'ÉTAPE 6 :** Dépôt Git complet, procédure d'installation dans le `README.md`, et le tableau des tests de recette rempli.

---

## Page 14 : Perspectives et évolutions futures

### 4. Ce qui vient après

Le projet ne s'arrête pas à la version locale. Les choix de conception effectués ici conditionnent directement la suite des TP du cursus :

| Phase | Activité réalisée | Exigence technique préalable |
| --- | --- | --- |
| **Partie 1 (TP3)** | Déploiement sur 3 Machines Virtuelles (VM) distinctes | Séparation stricte des 3 couches et configuration via variables d'environnement |
| **Partie 2** | Conteneurisation de l'application sous Docker | Processus isolés et reproductibilité de l'installation |
| **Partie 3** | Injection de charge avec Apache JMeter et métriques | Stabilité des routes API et jeu de données conséquent |

```
                       +-----------------------------------+
                       | Exigences de conception requises :|
                       | 1. Processus isolés               |
                       | 2. Configuration externalisée     |
                       | 3. Procédure reproductible        |
                       +-----------------------------------+

```

---

## Page 15 : Livrables, structure du dépôt Git et évaluation

### 5. Livrables et organisation

#### 5.1 Récapitulatif des livrables

| Étape | Livrable attendu |
| --- | --- |
| **Étape 1** | Document d'analyse fonctionnelle (PDF, 2 à 4 pages) |
| **Étape 2** | Lien du prototype Figma interactif + Capture Écran zéro |
| **Étape 3** | Scripts SQL (`schema.sql`, `data.sql`, `queries.sql`) |
| **Étape 4** | Code source API Python, `requirements.txt`, exemples `curl` |
| **Étape 5** | Code source Front-End + Démo vidéo/captures |
| **Étape 6** | Tableau des tests, guide d'installation, dépôt Git final |

#### 5.2 Organisation recommandée du dépôt Git

```text
/
├── README.md               <-- Procédure d'installation et présentation
├── analyse/
│   └── cas_d_usage.pdf     <-- Livrable Étape 1
├── maquette/
│   ├── figma_link.txt      <-- Lien vers le Figma
│   └── ecran_zero.png      <-- Capture Écran zéro
├── donnees/
│   ├── schema.sql          <-- Script de création SQL
│   ├── data.sql            <-- Script de jeu de données
│   └── requetes.sql        <-- Requêtes de vérification SQL
├── metier/
│   ├── app/                <-- Code source backend Python
│   ├── .env.example        <-- Exemple de configuration
│   └── requirements.txt    <-- Dépendances Python
├── client/
│   └── ...                 <-- Code source frontend HTML/CSS/JS
└── tests/
    └── cahier_de_tests.pdf <-- Tableau des tests de recette

```

#### 5.3 Critères d'évaluation

La grille d'évaluation s'appuie sur la conformité de la séparation en trois couches, la rigueur de la gestion des accès et de la sécurité, la fidélité de l'interface aux maquettes validées, ainsi que la qualité du dépôt et du dossier de tests.

---

## Page 16 : Calendrier et suivi du projet

### 6. Calendrier et suivi

* **Validation du jalon Figma (Étape 2) :** Étape obligatoire d'évaluation intermédiaire. Tout développement de code démarré avant cette validation sera rejeté.
* **Suivi hebdomadaire :** Avancement contrôlé à chaque séance de TP.
* **Soutenance finale :** Démonstration en direct du produit, passage de jeux d'essai d'évaluation et revue de code source.

> ⚠️ **ATTENTION**
> Les retards de rendu sur le jalon Figma bloquent l'avancement des étapes suivantes du projet.

---

## Page 17 : Récapitulatif des 6 erreurs les plus fréquentes

### 7. Erreurs les plus fréquentes

Ces six erreurs sont régulièrement constatées lors des soutenances. Il convient de les anticiper :

| # | Erreur commise | Conséquence directe sur le projet |
| --- | --- | --- |
| **1** | **Le client interroge directement la BDD** | Déploiement distribué impossible, identifiants de BDD exposés. |
| **2** | **L'identité vient d'un paramètre client** | Faille de sécurité majeure : usurpation de compte utilisateur. |
| **3** | **Adresse de la BDD codée en dur** | Nécessite la réécriture du code lors des déploiements VM/Docker. |
| **4** | **Mot de passe en clair ou SHA-256 basique** | Note éliminatoire sur le critère de sécurité de la couche métier. |
| **5** | **Règles métier gérées côté code seulement** | Risque d'incohérence et de corruption des données en BDD. |
| **6** | **Code écrit avant validation du Figma** | Écrans à redévelopper entièrement, étape non validée. |
