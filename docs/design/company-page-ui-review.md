# Page entreprise — revue du 1er octobre 2026

Périmètre : présentation, informations entreprise et liste des stages. Skill appliqué : `better-ui`.

## Hiérarchie et regroupement

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/pages/CompanyDetail.tsx:95`, `frontend/src/pages/CompanyDetail.css:4` | Identité peu marquée et accès aux offres dispersé | En-tête avec identité, secteur, nombre de stages et action principale | Hiérarchie : identifier l'entreprise et accéder rapidement aux stages |
| MEDIUM | `frontend/src/pages/CompanyDetail.css:25`, `frontend/src/pages/CompanyDetail.tsx:26` | Informations longues et espaces imposés par la hauteur du récapitulatif | Récapitulatif latéral sur deux rangées, rubriques dépliables avec aperçu | Regroupement : parcourir les thèmes puis ouvrir leur contenu complet |
| MEDIUM | `frontend/src/pages/CompanyDetail.tsx:37`, `frontend/src/pages/CompanyDetail.css:78` | Logo et nom de l'entreprise répétés dans chaque offre | Cartes centrées sur le poste, le lieu et les raisons de recommandation | Hiérarchie : comparer les stages d'une même entreprise |

## Surfaces et interactions

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `frontend/src/pages/CompanyDetail.css:44`, `frontend/src/theme.css:232` | Surfaces peu différenciées | Ombres légères adaptées aux thèmes, séparateurs structurels conservés | Profondeur : distinguer les contenus interactifs sans accentuer chaque bordure |
| LOW | `frontend/src/pages/CompanyDetail.css:65` | Recherche et modes d'affichage peu regroupés | Barre commune, sélection visible et champ avec icône | Regroupement : rendre les filtres lisibles et cohérents |

Vérifié : build, contrôle des tokens, lint ciblé, cinq tests Playwright existants
(navigation, recommandations, pagination, erreurs, texte hostile), rendu desktop
clair et sombre, rubriques ouvertes, ouverture au clavier et focus visible.
Pas de débordement horizontal à 320, 390, 768 et 1024 px. Aucune erreur JavaScript
dans l'aperçu Stripe. Transitions désactivées avec reduced motion ; hover contrôlé.

L'aperçu utilise les données publiques réelles du catalogue local Stripe avec
une authentification simulée dans un navigateur isolé. Le thème sombre est forcé
pour vérifier les tokens.

Not verified : connexion réelle de l'utilisateur, lecteur d'écran, contrôle
exhaustif des états de chargement et vides, press dans le navigateur, replay à
10 % dans le panneau Animations. Aucun mouvement d'entrée temporisé ajouté.

Approve — périmètre inspecté uniquement ; aucune anomalie HIGH restante.
