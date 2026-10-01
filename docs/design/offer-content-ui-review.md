# Lecture structurée des offres — revue du 1er octobre 2026

Périmètre : faits prioritaires, rubriques et deux modes de lecture de la fiche.
Skill appliqué : `better-ui`. Les styles réutilisent les tokens existants.

## Hiérarchie et structure

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/components/offers/OfferFacts.tsx:25`, `frontend/src/pages/OfferDetail.css:71` | Carte haute, champs sur une seconde ligne et contrôles « Voir l'extrait » répétés | Grille fluide, valeurs connues accentuées, inconnues discrètes, extraits retirés de la carte à la demande de l'utilisateur | Structure : lire les informations clés sans encombrement |
| MEDIUM | `frontend/src/components/offers/OfferDescription.tsx:46` | Description linéaire, titres répétés et préférences mêlées au profil | Rubriques regroupées, compétences facultatives séparées, annonce complète accessible | Structure : scan plus rapide tout en conservant les passages sources |

## États visibles et interaction

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/pages/OfferDetail.tsx:50`, `frontend/src/pages/OfferDetail.css:59` | Liens Description/Sources puis titre puis onglets, séparateurs et espaces répétés | Un accès aux sources à côté du titre, deux modes regroupés dans un contrôle segmenté | Hiérarchie : une seule navigation par fonction |
| LOW | `frontend/src/pages/OfferDetail.css:77` | Onglet actif isolé et deuxième mode sans contenant commun | Contenant partagé, rayon extérieur égal au rayon intérieur plus l'inset, sélection contrastée | Surfaces concentriques : montrer que les deux boutons changent la même vue |
| LOW | `frontend/src/pages/OfferDetail.css:81` | Aucun retour au press des onglets | Scale 0.96 au press, désactivé avec reduced motion ; sélection et focus restent statiques | Feedback : interaction perceptible et compatible avec la réduction de mouvement |

Vérifié : 15 tests navigateur fiche/moteur, onglets au clavier, absence des contrôles
« Voir l'extrait », lien Sources fonctionnel, description vide, préférences, conflits, texte hostile rendu littéralement,
liens externes et retour au catalogue. Build et contrôle des tokens réussis.

L'annonce réelle Sanofi 2512 a été affichée via son API locale avec le shell
d'authentification simulé. Une seconde capture reprend les quatre champs de la capture
utilisateur avec des facts simulés (durée, début absent, rémunération absente, anglais).
Captures desktop clair et mobile avec tokens sombres ;
aucun débordement horizontal aux largeurs 320, 390, 768 et 1440 px ; aucun message
`pageerror`. Hover, focus, press, état sélectionné, puis mouvement réduit contrôlés
dans le navigateur : focus solid, scale 0.96 puis 1 avec reduced motion. Build, tokens
et lint sans erreur ; trois avertissements Fast Refresh existants dans EngineControls.

Not verified : lecteur d'écran réel, parcours complet de connexion, inspection
exhaustive des états de chargement, replay à 10 % dans le panneau Animations. Aucun
mouvement temporisé introduit. Le thème sombre a été forcé pour tester
ses tokens ; la présence d'un sélecteur de thème dans le produit n'est pas revendiquée.

Approve — uniquement pour le périmètre inspecté ; aucune anomalie HIGH restante.
