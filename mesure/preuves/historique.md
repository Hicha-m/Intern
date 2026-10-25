# Preuves historiques des étapes 15 à 18

Les liens des livrables pointent vers les copies publiées dans `mesure/preuves/`.
Le rangement des campagnes avait déplacé l’étape 17 et retiré du dernier état
Git certaines pièces des étapes 15, 16 et 18, sans actualiser leurs liens.

Le 25 octobre 2026, douze fichiers légers ont été récupérés **à l’identique**
depuis le [commit d’origine conservé dans Git](https://github.com/OmarBenje/Intern/tree/68cd51e333f0a2eb649078e85b54844cf32053a6/mesure/resultats).
Ce sont des preuves d’exécutions antérieures, pas de nouvelles mesures.
Le [registre de provenance](historical-sources.json) donne pour chaque copie
le chemin original, l’identifiant du contenu Git, la taille et le SHA-256.

| Étape | Preuves disponibles | Portée |
| --- | --- | --- |
| 15 | [Réussite GUI](etape15/reussite.png), [échec GUI](etape15/echec.png), [CSV de contrôle](etape15/) | Sept fichiers : captures et résultats CLI/GUI, dont un contrôle avec deux candidats. |
| 16 | [Synthèse d’étalonnage](etape16/etalonnage.json) | Résultats, protocole et empreintes des CSV d’origine. Les CSV volumineux restent accessibles dans [l’historique Git](https://github.com/OmarBenje/Intern/tree/68cd51e333f0a2eb649078e85b54844cf32053a6/mesure/resultats/etape16), avec les liens détaillés dans le [rapport d’étalonnage](../ETAPE16.md). |
| 17, historique | [Dossier complet déjà publié](etape17/), [vérification](etape17/verification.json) | 16 paliers, 22 199 échantillons, interruption Docker documentée. C’est la source de l’analyse de l’étape 18. |
| 17, autre campagne | [Vérification archivée](campagne/verification.json) | 16 paliers, 22 206 échantillons, aucun incident consigné. Ce bilan distinct ne remplace pas la campagne historique de l’étape 18 ; les [fichiers associés](https://github.com/OmarBenje/Intern/tree/68cd51e333f0a2eb649078e85b54844cf32053a6/mesure/resultats/campagne) restent dans l’historique Git. |
| 18 | [Calculs](etape18/analyse.json), [comparaison CSV](etape18/comparaison.csv), [empreintes d’origine](etape18/SHA256SUMS) | Les empreintes d’entrée de l’analyse correspondent au manifeste, au journal et aux deux relevés de `preuves/etape17/`. |

Les chemins internes des fichiers archivés sont conservés. En particulier,
`etape18/SHA256SUMS` décrit les chemins et le contenu lors de l’analyse initiale ;
il ne sert pas de manifeste du rangement actuel. Pour les douze copies restaurées,
utiliser les SHA-256 du registre de provenance.

Les scripts de nouvelle mesure continuent à écrire dans `mesure/resultats/`,
ignoré par Git. Pour rejouer une analyse historique qui attend ces chemins,
travailler dans une copie de travail et rétablir les entrées d’origine depuis
le commit cité ; conserver les archives de `mesure/preuves/` en lecture seule.
