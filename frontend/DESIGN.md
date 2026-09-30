# Intern — Design system CSS

Le rendu de référence reste une interface claire à accent orange, avec photo sombre,
coins de 22 px et marge de 12 px. Le mode sombre reste disponible avec `class="dark"`
sur `<html>`. Aucun framework UI supplémentaire ni police distante n’est requis.

## Architecture

| Niveau | Fichier | Rôle |
| --- | --- | --- |
| Fondations | `src/tokens.css` | Échelle d’espace, typo, rayons, tailles, bordures, focus, mouvement, couches |
| Couleurs | `src/theme.css` | Palettes, rôles sémantiques et variantes clair/sombre |
| Composants | `src/components/auth/auth.css`, `src/App.css` | Composition avec des variables, sans valeurs de design locales |

Les tokens `--space-*` sont partagés entre margin, padding et gap. Leur nom correspond
à des pas de 4 px à la taille de texte par défaut. Les dimensions sont en rem pour
suivre le réglage de taille du texte. Les traits fins et le focus restent en pixels.
Le navigateur garde sa taille racine par défaut : pas de `font-size: 62.5%`.

| Besoin | Tokens principaux |
| --- | --- |
| Espacements | `--space-1` à `--space-22` (échelle sélectionnée) |
| Formulaires | `--form-gap`, `--field-gap`, `--control-padding-x`, `--form-width` |
| Arrondis | `--radius-control`, `--radius-card`, `--radius-notice`, `--radius-image` |
| Tailles interactives | `--control-height` (54 px), `--target-size` (44 px), `--icon-size` |
| Texte | `--font-sans`, `--font-size-*`, `--font-weight-*`, `--line-height-*`, `--tracking-*` |
| Couleurs | `--text`, `--muted`, `--background`, `--surface`, `--accent-*` |
| Champs | `--field-background`, `--field-text`, `--field-border`, `--field-border-hover` |
| Boutons | `--button-background`, `--button-background-hover`, `--button-text` |
| Erreurs | `--error-text`, `--error-background`, `--error-border` |
| Focus | `--focus-ring`, `--focus-width`, `--focus-offset` |
| Mouvement | `--duration-fast`, `--duration-spin`, `--ease-interactive`, `--scale-pressed` |
| Photo | `--image-inset`, `--image-shade`, `--image-outline`, `--text-on-image*` |

Les tokens `--auth-*` décrivent la composition spécifique de l’écran validé ; ils
ne doivent pas servir de valeurs génériques pour les futurs écrans. Par exemple,
un bouton réutilise `--radius-control`, pas `--radius-image`.

```css
.example-control {
  min-height: var(--control-height);
  padding: var(--space-3) var(--control-padding-x);
  border-radius: var(--radius-control);
  background: var(--button-background);
  color: var(--button-text);
}
```

## Règles d’usage

- Consommer les couleurs sémantiques dans les composants, jamais `--orange-9` directement.
- Réutiliser l’échelle avant d’ajouter un token. Ajouter un rôle quand il représente
  une décision partagée, pas une variable pour chaque déclaration CSS.
- Les rôles de couleur sont déclarés sur chaque thème pour que les alias se recalculent
  correctement dans un thème imbriqué. Ne pas les déplacer dans un `:root` indépendant.
- Préférer `min-height` à une hauteur fixe pour les contrôles et laisser le document
  défiler si le texte agrandi ou les erreurs nécessitent de l’espace.
- Les états focus, survol, pressé, désactivé, attente et erreur utilisent les mêmes rôles.
  Les erreurs gardent du texte explicite et `role="alert"` ; la couleur seule ne suffit pas.
- Labels toujours visibles, aides persistantes via `aria-describedby`, autocomplete natif.
  Le bouton du mot de passe est ancré au champ, indépendamment du texte d’aide.
- Cibles de 44 px retenues pour le confort. Cette valeur est un choix produit ; WCAG 2.2
  AA définit un minimum de 24 px avec exceptions, pas une obligation générale de 44 px.
- Focus de 2 px avec décalage de 3 px ; contraste du texte testé à 4.5:1, bordures de
  champs et focus à 3:1. Le texte sur photo dépend aussi du recadrage et doit être relu
  lorsqu’on remplace l’image ; aucun audit global WCAG n’est revendiqué.
- `prefers-reduced-motion` supprime les transitions et rotations ; le libellé d’attente
  reste compréhensible sans animation.

## Responsive et exceptions

Les valeurs fluides et adaptations vivent dans `tokens.css`. Les ruptures structurelles
(masquer la photo, passer en colonne) restent dans les composants. Les conditions
`@media` restent littérales : 720 px mobile, 999 px tablette, 680 px de hauteur compacte.
Les variables CSS ne fonctionnent pas dans ces conditions natives.

Les valeurs de structure (`0`, `100%`, fractions de grille, `100dvh`, `auto`), la rotation
complète du spinner et la géométrie des SVG ne sont pas des tokens de design. Les
couleurs brutes et valeurs rem/px/ms appartiennent aux deux fichiers de tokens.

## Recommandations consultées le 30 septembre 2026

- [Spectrum — design tokens](https://spectrum.adobe.com/page/design-tokens/) : noms,
  valeurs et alias pour porter des décisions partagées. Architecture adaptée à la
  taille actuelle du frontend, sans copier tout un catalogue.
- [USWDS — spacing units](https://designsystem.digital.gov/design-tokens/spacing-units/) :
  une échelle commune pour les espacements. Notre base de 4 px est un choix Intern.
- [Radix — usage des gammes](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) :
  séparer surfaces, bordures, accents et texte ; vérifier le contraste des palettes personnalisées.
- [W3C — focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance) :
  visibilité et contraste du focus (critère AAA, utilisé ici comme objectif).
- [W3C — target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) :
  taille des cibles (AA).
- [W3C — formulaires](https://design-system.w3.org/styles/forms.html) : labels visibles
  et consignes séparées des placeholders.

## Vérification et entretien

`npm run check:tokens` détecte les références absentes, couleurs primitives consommées
par les composants et valeurs de design locales. Le build exécute ce contrôle.
C’est une garde de style légère, pas un parseur CSS complet ni une preuve d’accessibilité.

`npm run test:e2e` couvre les parcours d’authentification avec API contrôlée et le design :
contrastes clair/sombre calculés dans le navigateur, tailles 1280×720, 900×600,
390×844 et 320×568, texte doublé, focus clavier, mouvement réduit et captures desktop/mobile.
Ces checks ne couvrent pas tous les navigateurs ni les lecteurs d’écran.

## Inscription et onboarding

`/register` commence par un seul champ e-mail. Deux étapes suivent dans le même
écran : nom complet puis mot de passe. Le bouton Retour conserve les saisies en
mémoire React ; le rechargement efface le brouillon. Aucun compte n’est créé avant
la dernière étape et aucun secret n’est écrit dans le stockage navigateur.

La connexion utilise désormais l’e-mail. L’API conserve la compatibilité avec les
anciens identifiants ; pour une inscription sans identifiant, Django en génère un
interne. Le compte et le profil sont créés dans une transaction puis la session
est ouverte. Les adresses déjà utilisées sont refusées ; les e-mails ambigus
historiques ne permettent pas de sélectionner un compte à la connexion.
L’envoi d’un e-mail de vérification reste à implémenter.

Les trois étapes partagent les composants et tokens : focus sur le titre de l’étape (ou le champ en erreur), labels persistants,
autocomplete, affichage du mot de passe et collage autorisé. Les erreurs serveur
ramènent à l’étape concernée. Aucun renvoi automatique des données après un échec.

L’écran e-mail occupe la hauteur du viewport. Le formulaire reste centré ; les
petites hauteurs et le zoom peuvent défiler pour préserver l’accès aux contrôles.
Les apparitions utilisent 240 ms, un décalage de 12 px et des délais de 40 ms.
La photo reste immobile ; le mode réduction des animations désactive ces effets.

Sources : [W3C, notifications de formulaire](https://www.w3.org/WAI/tutorials/forms/notifications/)
et [GOV.UK, champ mot de passe](https://design-system.service.gov.uk/components/password-input/).
