# Figma : conception et ingénierie front d’Intern

Omar Benjelloun et Hicham Mohammed · Polytech Marseille 2026-2027 · Mis à jour le 25 octobre 2026.

Ce document présente le prototype d’Intern, nos sources d’inspiration et notre travail avec l’IA. Il relie les choix d’interface aux corrections et aux preuves conservées dans le dépôt, pour permettre à une autre équipe de reprendre le projet.

**Sommaire**

1. [Prototype et périmètre](#prototype-et-périmètre)
2. [Sources d’inspiration](#sources-dinspiration)
3. [Outils et méthode de travail](#outils-et-méthode-de-travail)
4. [Travail d’ingénierie front](#travail-dingénierie-front)
5. [Prompts et corrections](#prompts-et-corrections)
6. [Reprendre et vérifier le projet](#reprendre-et-vérifier-le-projet)

## Prototype et périmètre

Le prototype décrit les parcours **candidat, recruteur et administrateur**, avec leurs états d’erreur et leurs écrans vides. Il définit les interactions ; le frontend React les fait fonctionner avec l’API du backend.

Pour explorer le prototype :

- [Ouvrir le prototype cliquable](https://www.figma.com/proto/2zB64zoXsnJQ24R1yysJ72/Intern?node-id=223-302&p=f&viewport=191%2C-32%2C0.02&t=u6i49kJLKHdhAkM4-8&scaling=scale-down-width&content-scaling=fixed&page-id=223%3A301&starting-point-node-id=223%3A302&hide-ui=1)
- [Ouvrir le fichier Figma modifiable](https://www.figma.com/design/2zB64zoXsnJQ24R1yysJ72/Intern?node-id=223-301&t=Pgc5H2wNNSiyyS3W-1)
- [Consulter les parcours et points de départ](../maquette/README.md)

Le [manifeste historique](../maquette/figma_manifest.json) recense **27 écrans et 41 interactions** : 10 écrans candidat, 13 recruteur et 4 administrateur. Ce relevé correspond à l’ancien écran zéro `142:38134`. Le prototype courant commence à `223:302` ; ces chiffres décrivent la version historique.

<details>
<summary>Voir l’aperçu du prototype</summary>

![Écran zéro du prototype Figma](../maquette/ecran_zero.jpg)

</details>

## Sources d’inspiration

Nous nous sommes inspirés de **Simplify** et de **Tsenta** pour la recherche d’offres, le profil candidat et le suivi des candidatures. Nos analyses de leurs pages publiques datent du 30 septembre 2026 :

- **[Simplify](research/2026-09-30-simplify.md)** : catalogue explorable, profil candidat partagé, fiches d’offres structurées et suivi des candidatures.
- **[Tsenta](research/2026-09-30-tsenta.md)** : parcours découverte → préparation → candidature → suivi, et présentation des critères de stage.

Nous avons adapté ces références à la recherche de stages en Europe, aux trois rôles d’Intern et aux règles du backend Django. L’autocandidature étudiée chez ces services reste une piste d’évolution pour Intern.

## Outils et méthode de travail

Nous avons utilisé **Codex** comme assistant de développement pour le frontend React et le backend Django, avec les outils et skills suivants :

| Outil ou skill | Usage dans Intern |
| --- | --- |
| Codex | Assistance au développement frontend et backend |
| better-ui | Travail sur l’interface React |
| Bonnes pratiques d’Emil Kowalski | Interactions et animations |
| React Doctor | Revue du code React |
| Superpowers | Accompagnement du développement de la couche métier Django |

Les décisions documentées concernent la simplification de l’authentification, la présentation des offres, l’organisation du profil et l’inscription. Les exemples ci-dessous précisent les problèmes rencontrés et les corrections retenues.

Les choix d’architecture backend, les fonctionnalités et leurs vérifications sont décrits dans la documentation backend et le cahier de tests.

## Travail d’ingénierie front

Le travail porte sur les parcours, les composants et leur fonctionnement avec les données réelles. Les étapes suivantes renvoient aux traces conservées, sans reconstituer une chronologie des échanges avec l’IA :

1. **Définir les usages.** Décrire les rôles, les droits et les parcours, y compris les cas vides ou en erreur. Source : [analyse fonctionnelle](../analyse/cas_d_usage.md).
2. **Relier les écrans.** Donner un point d’entrée à chaque rôle et rendre les parcours navigables. Source : [manifeste du prototype](../maquette/figma_manifest.json).
3. **Réutiliser les composants.** Centraliser les couleurs, les espacements et les contrôles pour garder une interface cohérente. Sources : [règles de design](../frontend/DESIGN.md), [tokens](../frontend/src/tokens.css) et [thèmes](../frontend/src/theme.css).
4. **Raccorder le backend.** Gérer la session, les formulaires et la protection contre les requêtes intersites frauduleuses (CSRF). Distinguer chargement, erreur et résultat vide. Sources : [client HTTP](../frontend/src/lib/api.ts), [session](../frontend/src/auth/Session.tsx) et [validation frontend](../frontend/VALIDATION.md).
5. **Vérifier les parcours.** Comparer le rendu au prototype, contrôler les petits écrans et exécuter la recette. Sources : [comparaison Figma T25](../tests/figma-comparison.md), [captures](../frontend/captures/README.md) et [cahier de tests](../tests/README.md).

Deux exemples montrent ce travail dans le code :

- [AuthField](../frontend/src/components/auth/AuthControls.tsx) relie chaque champ à son label, à son aide et à son erreur.
- [Register](../frontend/src/pages/Register.tsx) conserve les saisies au retour et bloque les soumissions pendant une requête.

Django applique les règles d’accès.

## Prompts et corrections

Cette section distingue une **trace originale conservée** et quatre **exemples reconstitués**. Le recours à l’IA pour Figma a été évoqué lors du bilan avec l’enseignant.

### Trace originale : le visuel d’authentification

Le prompt `imagegen` du 30 septembre 2026 figure dans la [revue source](design/auth-editorial.md#artwork-provenance). Il concerne une image décorative, **pas la création du prototype Figma**.

<details>
<summary>Prompt original de génération du visuel (imagegen)</summary>

> Create a premium editorial architecture photograph for the Intern career platform. Portrait 3:4 format, photorealistic analog medium format architectural photography. A REAL monumental burnt bright orange painted steel spiral staircase seen from below, dramatic sculptural diagonal sweeping upward from lower right toward upper left, brushed orange metal railing with slight lived-in texture, pale warm ivory concrete modernist interior around it. A small circular skylight with pale daylight, softly lit warm neutral walls. Restrained, highly composed, art-school architecture magazine aesthetic, authentic physical detail, subtle fine photographic film grain, deep natural shadows and sunlight. Orange dominates the stair but cream dominates negative space. Strong graphic composition, sophisticated and memorable. Fill the vertical frame; close crop of stair geometry, not a wide empty room. NO text, NO lettering, NO logos, NO people, NO floating objects, NO CGI plastic, NO surrealism, NO gradients used as graphics, NO mockup. This is a standalone photograph, no UI. It will be placed on a warm paper editorial login page next to very large ink typography. The orange should feel like painted steel, not glowing light. Produce one final image.

</details>

Le [visuel livré](../frontend/public/images/intern-first-step.webp) résulte d’un cadrage portant sur l’usage, le format, la composition, la palette et les éléments à exclure. Le contrôle humain documenté porte sur l’intégration, les contrastes et les petits écrans. L’historique complet des essais de génération n’est pas disponible.

### Exemples reconstitués

L’historique des échanges n’étant plus accessible, les prompts suivants ont été rédigés a posteriori pour illustrer notre démarche. **Ce ne sont pas des transcriptions des conversations initiales.** Les problèmes et corrections correspondent aux évolutions documentées du projet.

Chaque exemple suit le même format : **prompt → problème constaté → correction retenue → preuve**.

#### 1. Simplifier l’authentification

**Prompt reconstitué :**

> Conçois les écrans de connexion et d’inscription d’Intern, une plateforme de recherche de stages. Utilise une identité visuelle orange et crème, une typographie expressive et un visuel architectural. Présente clairement le formulaire et les actions principales. Prévois les états vide, saisie en cours, chargement et erreur, ainsi qu’une adaptation sur mobile.

**Problème constaté :** les textes répétés, les labels séparés et les champs rectangulaires donnaient trop de poids visuel au formulaire.

**Correction retenue :**

- Garder les titres et les actions essentielles ; supprimer les textes redondants.
- Intégrer des labels persistants aux champs et matérialiser ceux-ci par un soulignement.
- Conserver les états de focus et d’erreur, ainsi que la navigation au clavier.

**Preuve :** [revue de l’authentification](design/auth-editorial.md).

#### 2. Aligner l’inscription sur le backend

**Prompt reconstitué :**

> Conçois un parcours d’inscription progressif pour Intern : choix du rôle candidat ou recruteur, adresse e-mail, nom complet et mot de passe. Permets de revenir à l’étape précédente sans perdre les informations. Prévois les erreurs de validation, l’attente pendant l’envoi et un écran de confirmation après la réponse du serveur.

**Problème constaté :** le backend crée un compte en attente d’activation. Une confirmation annonçant un accès immédiat serait incorrecte.

**Correction retenue :**

- Afficher l’attente de validation du superviseur après l’inscription.
- Ne pas ouvrir de session automatiquement.
- Expliquer le refus de connexion tant que le compte reste inactif.

**Preuves :** [validation frontend](../frontend/VALIDATION.md) et [écran d’attente d’activation](../frontend/captures/ecrans/10-inscription-candidate-attente.png).

#### 3. Faciliter la lecture d’une offre et la candidature

**Prompt reconstitué :**

> Crée une fiche de stage pour Intern comprenant le titre, l’entreprise, la localisation, la description, les missions, les compétences et le lien pour postuler. Organise ces informations pour permettre au candidat de comprendre rapidement l’offre. Prévois une version ordinateur et une version mobile, ainsi que les cas où certaines informations sont absentes.

**Problème constaté :** le bandeau et l’espace supérieur éloignaient l’action de candidature. Les descriptions importées formaient parfois de longs blocs peu structurés.

**Correction retenue :**

- Supprimer le bandeau redondant et donner à l’offre son propre titre principal.
- Placer le panneau de candidature dès le début sur ordinateur et avant la description sur mobile.
- Structurer les paragraphes et les listes, sans inventer les informations manquantes.

**Preuve :** [revue de la fiche offre](design/offer-detail-ui-review.md).

#### 4. Enrichir le profil candidat

**Prompt reconstitué :**

> Conçois la page de profil candidat d’Intern. Le candidat doit pouvoir consulter son CV courant, le remplacer et retrouver les informations utiles à ses candidatures. Présente clairement les données renseignées et celles qui restent à compléter. Prévois les états d’enregistrement, de réussite et d’erreur.

**Problème constaté :** un écran centré sur le téléchargement du CV ne permettait pas de gérer toutes les informations du candidat.

**Correction retenue :**

- Séparer identité, présentation, expériences, formations, compétences et préférences.
- Donner à chaque section un brouillon et des actions pour enregistrer ou annuler.
- Conserver les saisies en cas d’erreur, sans déduire automatiquement des informations du CV.

**Preuve :** [évolution du profil](design/profile.md).

## Reprendre et vérifier le projet

Une autre équipe peut reprendre le travail en suivant ces étapes :

1. Lire l’analyse fonctionnelle et parcourir les trois rôles dans Figma. Conserver les identifiants d’écrans du manifeste, en tenant compte de sa version historique.
2. Suivre le [démarrage local](../README.md#démarrage-local) avec les comptes fictifs. Retrouver ensuite les écrans dans `frontend/src/pages/` et les composants dans `frontend/src/components/`.
3. Réutiliser les tokens et le client HTTP. Pour chaque évolution, mettre à jour le parcours, ses états dégradés et les tests concernés.
4. Exécuter les contrôles frontend ci-dessous, puis compléter avec la [recette sur API et base réelles](../tests/README.md).
5. Comparer le rendu aux [captures livrées](../frontend/captures/README.md). Archiver les nouvelles décisions et les prompts réellement utilisés.

Depuis la racine du dépôt, lancer la compilation, l’analyse du code et les tests navigateur :

```sh
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run test:e2e
```

### Résultats consignés et points à vérifier

Les résultats suivants sont **historiques** ; ils ne proviennent pas d’une nouvelle exécution lors de la rédaction :

| Contrôle | État consigné |
| --- | --- |
| Tests navigateur avec API contrôlée | 104 réussis, 3 scénarios optionnels ignorés |
| Recette avec API et base réelles | Consignée séparément dans le cahier de tests |
| Comparaison Figma, T25 | Déclarée réalisée par l’équipe le 21 octobre |
| Installation sur VM vierge, T24 | À vérifier |

Les contrôles ciblés couvrent les petits écrans, le zoom, les contrastes, le focus et la réduction des animations. Ils ne constituent pas un audit complet d’accessibilité. Les contraintes et résultats détaillés figurent dans la [validation frontend](../frontend/VALIDATION.md).
