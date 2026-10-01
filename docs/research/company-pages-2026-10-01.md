# Pages entreprise et recommandations — 1 octobre 2026

## Benchmark observé

Sources publiques consultées à cette date ; les éléments présents sur une fiche ne sont pas nécessairement disponibles pour toutes les entreprises.

| Référence | Informations mises en avant | Traduction pour Intern |
|---|---|---|
| [Simplify, Stripe](https://simplify.jobs/c/Stripe) | Présentation, secteurs, effectif, stade, siège, création, financement/investisseurs, avantages, actualités, offres. La page propose aussi une analyse éditoriale, une notation et la mise en relation. | Réunir activité, chiffres et offres. Conserver source/date. Ne pas inventer une note de l’entreprise ni une possibilité de recommandation personnelle. |
| [Welcome to the Jungle, marque employeur](https://solutions.welcometothejungle.com/marque-employeur) | Culture, valeurs, carrière, équipe et avantages, présentés au moyen de contenus de marque employeur. | Prévoir culture, conditions de travail, témoignages et médias sourcés. La page Contexte n’a livré que la navigation lors de l’ouverture directe : ne pas prétendre avoir inspecté sa fiche complète. |
| [JobTeaser, Storen](https://www.jobteaser.com/fr/companies/storen) | Présentation, organisation, secteur/type, adresse, chiffres, création, parité, âge, international, valeurs, RSE, photos et offres. FAQ jeunes talents : recrutement, télétravail, progression et embauche après stage. | Donner la priorité aux informations qui aident un étudiant à choisir son stage : mentorat, calendrier, conditions et perspectives. Une possibilité d’embauche n’est pas une garantie. |
| [Tsenta](https://tsenta.com/) | Met principalement en avant la découverte d’offres, leur adéquation au profil, la préparation et le suivi des candidatures. | Compléter la recherche par le contexte employeur. La page publique inspectée ne permet pas d’établir un inventaire complet de ses fiches entreprise. |

## Recommandations

[Simplify documente](https://help.simplify.jobs/articles/2166608-using-your-job-matches) un classement personnalisé à partir du profil, des préférences, de l’expérience, des compétences et des retours sur les offres.

Dans le code actuel d’Intern, les préférences acceptées de contrat et de mode de travail sont nécessaires ; leur absence produit `onboarding_required`. Les offres masquées et les entreprises exclues sont retirées des recommandations. Le rang SQL utilise les métiers/domaines, postes, lieux, compétences, contrats et modes, avant pagination. Les critères d’éligibilité sont évalués séparément et les raisons du classement sont renvoyées.

La page entreprise ajoute une vue **Pour vous**, filtrée par ID d’entreprise, à côté de **Tous les stages**, sélectionnée par défaut. L’absence de recommandations ne signifie donc pas que l’entreprise n’a aucune offre. Les raisons connues sont affichées sans convertir le score en pourcentage de chance d’obtenir le stage.

Recommandations produit restantes : préférences de secteur/effectif/stade, suivi d’entreprise et alertes, comparaison d’employeurs, enrichissement des conditions de stage par pays/site et renouvellement périodique des informations. Elles ne sont pas livrées par cette modification.

## Données et limites

Au premier relevé local : 1 476 entreprises, aucune description renseignée. Une extraction hors réseau des descriptions et snapshots déjà stockés a ajouté 60 présentations à son premier passage ; la base comptait alors 1 499 entreprises, car le moteur collecte en parallèle. Ces chiffres sont des observations locales, pas une couverture garantie.

Chaque entreprise dispose désormais d’une route stable `/companies/<id>`. Les présentations restent dans la langue de la source ; elles ne sont pas automatiquement traduites. Les métadonnées éditoriales sont distinctes des préférences privées du candidat.

Les pages affichent toutes les offres **publiées dans Intern**, avec recherche et pagination. Le serveur conserve sa limite : stages confirmés en Europe, ouverts, non expirés et disposant d’une source active récemment vérifiée. Cela ne signifie pas toutes les offres mondiales, ni tous les emplois de l’entreprise.

Les informations supplémentaires doivent avoir une URL source, une date et un type de source. Les absences sont explicites. Photos et vidéos peuvent être référencées par des entrées `media` avec lien source ; une galerie embarquée n’est pas livrée. Les actualités acceptent plusieurs entrées `news`, mais aucun flux de publication n’est collecté automatiquement.

Stripe a un premier profil détaillé relu depuis ses pages officielles [Présentation](https://stripe.com/about), [Compatibilité](https://stripe.com/careers/compatibility) et [Jeunes talents](https://stripe.com/careers/emerging-talent). Ces textes résument les déclarations de l’employeur ; leurs conditions ne sont pas généralisées à toutes les offres.
