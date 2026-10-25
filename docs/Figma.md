# Figma : conception, usage de l’IA et ingénierie front

Omar Benjelloun et Hicham Mohammed · Intern · Polytech Marseille 2026-2027.
État documentaire au 25 octobre 2026.

## Prototype et périmètre

Le prototype décrit les parcours candidat, recruteur et administrateur, leurs
états d’erreur et leurs écrans vides. Il sert de référence pour les parcours et
les interactions ; le frontend React porte leur fonctionnement avec l’API.

- [Fichier Figma modifiable](https://www.figma.com/design/2zB64zoXsnJQ24R1yysJ72/Intern?node-id=223-301&t=Pgc5H2wNNSiyyS3W-1).
- [Prototype cliquable, écran zéro](https://www.figma.com/proto/2zB64zoXsnJQ24R1yysJ72/Intern?node-id=223-302&p=f&viewport=191%2C-32%2C0.02&t=u6i49kJLKHdhAkM4-8&scaling=scale-down-width&content-scaling=fixed&page-id=223%3A301&starting-point-node-id=223%3A302&hide-ui=1).
- [Parcours et points de départ](../maquette/README.md) et [manifeste](../maquette/figma_manifest.json) : 27 écrans et 41 interactions recensés, dont 10 écrans accessibles côté candidat, 13 côté recruteur et 4 côté administrateur. Ces nombres proviennent du relevé historique conservé dans le dépôt (écran zéro `142:38134`). Le lien courant pointe vers `223:302` ; ce relevé ne constitue pas un nouvel inventaire de cette version du prototype.

![Écran zéro du prototype Figma](../maquette/ecran_zero.jpg)

## Outils utilisés et méthode de travail

Nous avons utilisé **Codex** comme assistant de développement pour le frontend et le backend d’Intern.

Pour le **frontend React**, nous nous sommes appuyés sur **better-ui** pour le travail d’interface, sur les **bonnes pratiques d’Emil Kowalski** pour les interactions et les animations, et sur **React Doctor** pour la revue du code React. Les évolutions documentées concernent notamment la simplification de l’authentification, la présentation des offres, l’organisation du profil candidat et l’alignement de l’inscription sur les règles du backend.

Pour le **backend Django**, nous avons également utilisé Codex avec les **skills Superpowers** afin d’accompagner le développement de la couche métier. Les choix d’architecture, les fonctionnalités réalisées et leurs vérifications sont décrits dans la documentation backend et le cahier de tests.

## Étapes d’ingénierie documentées

Ce tableau relie les décisions à leurs traces ; il ne reconstitue pas une
chronologie de conversations avec l’IA.

| Étape | Travail et effet recherché | Trace pour reprendre le travail |
| --- | --- | --- |
| Définir les usages | Décrire les trois acteurs, les droits et les parcours nominaux, vides ou en erreur. | [Analyse fonctionnelle](../analyse/cas_d_usage.md) |
| Relier les écrans | Donner un point d’entrée à chaque acteur et rendre les parcours navigables. | [Manifeste du prototype](../maquette/figma_manifest.json) |
| Organiser l’interface | Centraliser couleurs, espaces et contrôles ; réutiliser les mêmes composants pour éviter des écrans incohérents. | [Règles de design](../frontend/DESIGN.md), [tokens](../frontend/src/tokens.css), [thèmes](../frontend/src/theme.css) |
| Raccorder les données | Gérer la session, les formulaires, le CSRF et les retours de l’API ; distinguer chargement, erreur et résultat vide. | [Client HTTP](../frontend/src/lib/api.ts), [session](../frontend/src/auth/Session.tsx), [validation frontend](../frontend/VALIDATION.md) |
| Corriger et vérifier | Comparer le rendu au prototype, adapter les petits écrans et contrôler les parcours. | [Comparaison Figma T25](../tests/figma-comparison.md), [captures réelles](../frontend/captures/README.md), [recette](../tests/README.md) |

## Améliorations successives observables

| Problème documenté | Modification et intérêt | Preuve |
| --- | --- | --- |
| Formulaire d’authentification visuellement chargé | Réduire les textes répétés et intégrer les labels aux champs tout en les gardant visibles ; conserver les retours d’erreur et le focus clavier. | [Revue de l’authentification](design/auth-editorial.md) |
| Action de candidature éloignée du contenu utile | Placer le panneau d’action dès le début sur ordinateur et avant la description sur mobile ; structurer la description en paragraphes et listes. | [Revue de la fiche offre](design/offer-detail-ui-review.md) |
| Profil limité au CV | Organiser les informations par section avec brouillons indépendants, annulation et conservation des saisies en cas d’erreur. | [Évolution du profil](design/profile.md) |
| Inscription présentée comme une connexion immédiate | Afficher l’attente d’activation demandée par l’API ; expliquer le refus de connexion avant activation. | [Validation frontend](../frontend/VALIDATION.md), [écran livré](../frontend/captures/ecrans/10-inscription-candidate-attente.png) |

Ces choix rendent l’interface exploitable avec des données et des erreurs réelles.
Par exemple, [AuthField](../frontend/src/components/auth/AuthControls.tsx) relie
le label, l’aide et l’erreur au champ ; [Register](../frontend/src/pages/Register.tsx)
conserve les saisies au retour et bloque les soumissions pendant la requête.
Les règles d’accès restent appliquées par Django.

## Prompts : traces conservées et limites

Le recours à l’IA pour Figma a été évoqué lors du bilan avec l’enseignant.
**Aucun texte original de prompt Figma n’a été retrouvé dans les fichiers de
conception consultés ni dans les commits d’ajout du prototype.** Le prompt initial,
les relances, les réponses et les versions du modèle ne sont donc pas reproduits
comme des traces originales.
Les étapes et corrections ci-dessus ne sont pas présentées comme des prompts.

Une trace exacte existe pour la génération du visuel d’authentification avec
`imagegen`, datée du 30 septembre 2026 dans la [revue source](design/auth-editorial.md#artwork-provenance).
Elle concerne une image décorative, **pas la création du prototype Figma**.
Le texte original et son résultat sont conservés ci-dessous.

<details>
<summary>Prompt original de génération du visuel (imagegen)</summary>

> Create a premium editorial architecture photograph for the Intern career platform. Portrait 3:4 format, photorealistic analog medium format architectural photography. A REAL monumental burnt bright orange painted steel spiral staircase seen from below, dramatic sculptural diagonal sweeping upward from lower right toward upper left, brushed orange metal railing with slight lived-in texture, pale warm ivory concrete modernist interior around it. A small circular skylight with pale daylight, softly lit warm neutral walls. Restrained, highly composed, art-school architecture magazine aesthetic, authentic physical detail, subtle fine photographic film grain, deep natural shadows and sunlight. Orange dominates the stair but cream dominates negative space. Strong graphic composition, sophisticated and memorable. Fill the vertical frame; close crop of stair geometry, not a wide empty room. NO text, NO lettering, NO logos, NO people, NO floating objects, NO CGI plastic, NO surrealism, NO gradients used as graphics, NO mockup. This is a standalone photograph, no UI. It will be placed on a warm paper editorial login page next to very large ink typography. The orange should feel like painted steel, not glowing light. Produce one final image.

</details>

[Voir le visuel livré](../frontend/public/images/intern-first-step.webp).

Cette trace documente un cadrage précis : usage de l’image, format, composition,
palette et éléments à exclure. Le contrôle humain documenté porte ensuite sur
l’intégration, les contrastes et les petits écrans ; l’historique complet des
essais de génération n’est pas disponible.

## Exemples de prompts reconstitués

L’historique original des échanges n’étant plus accessible, les prompts ci-dessous
ont été rédigés a posteriori pour illustrer notre démarche. Ils ne constituent
pas une transcription des conversations initiales. Les problèmes et corrections
correspondent aux évolutions documentées du projet.

### 1. Simplifier les écrans d’authentification

**Prompt reconstitué :**

> Conçois les écrans de connexion et d’inscription d’Intern, une plateforme de recherche de stages. Utilise une identité visuelle orange et crème, une typographie expressive et un visuel architectural. Présente clairement le formulaire et les actions principales. Prévois les états vide, saisie en cours, chargement et erreur, ainsi qu’une adaptation sur mobile.

**Problème constaté :**

Les textes d’accompagnement répétés, les labels séparés et les champs
rectangulaires donnaient trop de poids visuel au formulaire.

**Correction retenue :**

Conserver les titres et les actions essentielles, supprimer les textes redondants
et intégrer des labels persistants aux champs. Utiliser un soulignement pour
matérialiser les champs, avec des états de focus et d’erreur explicites.
Préserver la navigation au clavier.

### 2. Aligner l’inscription sur le fonctionnement du backend

**Prompt reconstitué :**

> Conçois un parcours d’inscription progressif pour Intern : choix du rôle candidat ou recruteur, adresse e-mail, nom complet et mot de passe. Permets de revenir à l’étape précédente sans perdre les informations. Prévois les erreurs de validation, l’attente pendant l’envoi et un écran de confirmation après la réponse du serveur.

**Problème constaté :**

Le parcours devait tenir compte d’une règle métier essentielle : l’API crée un
compte en attente d’activation. Une confirmation laissant penser que l’utilisateur
peut immédiatement accéder à son espace serait incorrecte.

**Correction retenue :**

Afficher explicitement l’attente de validation du superviseur après l’inscription.
Ne pas ouvrir automatiquement de session et expliquer le refus de connexion tant
que le compte reste inactif.

### 3. Améliorer la lecture d’une offre et l’accès à la candidature

**Prompt reconstitué :**

> Crée une fiche de stage pour Intern comprenant le titre, l’entreprise, la localisation, la description, les missions, les compétences et le lien pour postuler. Organise ces informations pour permettre au candidat de comprendre rapidement l’offre. Prévois une version ordinateur et une version mobile, ainsi que les cas où certaines informations sont absentes.

**Problème constaté :**

Le bandeau et l’espace au-dessus du contenu éloignaient l’action de candidature.
Les descriptions importées pouvaient également apparaître comme de longs blocs
de texte peu structurés.

**Correction retenue :**

Supprimer le bandeau redondant et donner à l’offre son propre titre principal.
Placer le panneau de candidature dès le début sur ordinateur et avant la
description sur mobile. Structurer les paragraphes et les listes sans inventer
les informations manquantes.

### 4. Faire évoluer le profil au-delà du dépôt de CV

**Prompt reconstitué :**

> Conçois la page de profil candidat d’Intern. Le candidat doit pouvoir consulter son CV courant, le remplacer et retrouver les informations utiles à ses candidatures. Présente clairement les données renseignées et celles qui restent à compléter. Prévois les états d’enregistrement, de réussite et d’erreur.

**Problème constaté :**

Un écran centré uniquement sur le téléchargement du CV ne permettait pas de gérer
l’ensemble des informations du candidat.

**Correction retenue :**

Organiser le profil en sections : identité, présentation, expériences, formations,
compétences et préférences. Donner à chaque section son propre brouillon et des
actions explicites pour enregistrer ou annuler. Conserver les saisies en cas
d’erreur et ne pas déduire automatiquement des informations du CV.

## Reprise et vérification par une autre équipe

1. Lire l’analyse et parcourir les trois rôles dans Figma ; conserver les identifiants des écrans du manifeste.
2. Suivre le [démarrage local](../README.md#démarrage-local) avec les comptes fictifs, puis retrouver l’écran dans `frontend/src/pages/` et ses composants dans `frontend/src/components/`.
3. Réutiliser les tokens et le client HTTP existants. Mettre à jour le parcours, ses états dégradés et les tests concernés lors d’une évolution.
4. Exécuter `npm --prefix frontend run build`, `npm --prefix frontend run lint` et `npm --prefix frontend run test:e2e` ; compléter par la [recette avec API et base réelles](../tests/README.md).
5. Comparer le rendu aux [captures livrées](../frontend/captures/README.md) et archiver les nouvelles décisions et les prompts réellement utilisés.

Les résultats déjà consignés distinguent 104 tests navigateur réussis avec API
contrôlée, 3 scénarios optionnels ignorés et une recette réelle séparée. Les
contrôles ciblés couvrent notamment petits écrans, zoom, contraste, focus et
réduction des animations ; ils ne constituent pas un audit complet d’accessibilité.
Ces résultats sont historiques, pas une nouvelle exécution lors de la rédaction.
T25 est déclaré réalisé par l’équipe le 21 octobre ; l’installation sur VM vierge
(T24) reste à vérifier. Les contraintes et résultats détaillés sont dans la
[validation frontend](../frontend/VALIDATION.md).
