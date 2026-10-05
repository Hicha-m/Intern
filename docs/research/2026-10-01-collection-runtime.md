# Exécution des collectes — 1er octobre 2026

## Causes constatées
Deux workers locaux tournaient ; les six collecteurs spécialisés étaient arrêtés.
Le catalogue partageait sa boucle avec des tâches de découverte et ne traitait
qu'un import avant une pause de 30 secondes. Le chiffre de 1567 échéances dépassées
incluait les BoardSchedule de sources synthétiques, alimentées par DiscoveryQuery.

## Changements et observation
Imports et maintenance séparés, neuf rôles supervisés, verrou exclusif par
workspace et redémarrage progressif des processus arrêtés. Un worker par rôle,
backoffs conservés. L'ordre ancienneté conserve l'équité entre les sources.

Entre 17:10:25 et 17:12:08 (Paris), la file ATS prête est passée de 116 à 101 ;
EURES de 30 à 27 et WTTJ de 46 à 43. Des erreurs persistent côté Bundesagentur et
sur certaines recherches LinkedIn ; un report sur erreur ne compte pas comme
une collecte réussie. Les imports réussis comprennent des mises à jour : aucun
gain en offres uniques n'est attribué à ces seuls compteurs.

532 tests passent ; séparation des rôles, métriques et redémarrage testés.
Second superviseur refusé en réel, neuf enfants actifs, backend HTTP200, Compose
valide. Les exports détaillés sont dans le dossier generated ignoré par Git.
La cadence sur une journée reste à mesurer ; pas de lancement automatique après
redémarrage du PC, ni de limiteur global de débit partagé entre tous les rôles.
