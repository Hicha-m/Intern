# Fiche offre — revue du 30 septembre 2026

Périmètre : fiche publique, contenu Sanofi 2512 et fixtures multilingues.
Skill appliqué : `better-ui`.

| Sévérité | Emplacement | Avant | Après | Principe et effet |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/components/dashboard/Workspace.tsx` | Bandeau générique et recherche au-dessus du titre | La fiche possède son titre h1, sans bandeau redondant | Hiérarchie : atteindre plus vite le stage |
| MEDIUM | `frontend/src/pages/OfferDetail.css` | Candidature sous un grand espace de titre | Panneau latéral dès le début sur ordinateur, avant la description sur mobile | Proximité de l'action et informations clés |
| MEDIUM | `frontend/src/pages/OfferDetail.tsx` | Retours de ligne bruts, entités et listes en paragraphes | Paragraphes normalisés, intertitres reconnus, listes sémantiques, texte React uniquement | Lisibilité et conservation du contenu source |
| LOW | `frontend/src/pages/OfferDetail.tsx` | Libellé workday brut, sources en fin de longue page | Workday correctement nommé, liens Description / Sources | Navigation et libellés contextualisés |

Vérifié : build et tokens ; quatre tests persistants de fiche ; lecture réelle de
l'API Sanofi dans un navigateur de test ; affichage 320, 390, 768 et 1440 px,
absence de débordement horizontal ; candidature externe, lien absent ou dangereux,
texte vide, preuves repliables, retour avec recherche/page, navigation par ancre.
Les informations structurées manquantes ne sont pas inventées depuis la prose.
Les nouvelles règles de focus sont présentes dans le CSS.

Not verified : inspection de chaque hover/active et animations à vitesse 10 %,
lecteur d'écran réel. Aucune animation nouvelle introduite. La fraîcheur affichée
dans les captures de fixtures dépend de leur horloge simulée.

Approve — pour le périmètre inspecté ; aucune anomalie HIGH identifiée.
