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
les relances, les réponses et les versions du modèle ne sont donc pas reproduits.
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

Pour compléter l’historique Figma, joindre les conversations originales ou leurs
exports avec, pour chaque itération : outil et date connus, prompt exact,
résultat, problème constaté, décision et capture associée. L’absence d’une trace
reste indiquée ; aucun dialogue n’est reconstruit.

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
