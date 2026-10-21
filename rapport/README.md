# Compte rendu du projet de virtualisation

Le [rapport final](intern-report.pdf) présente les déploiements VM et Docker,
les mesures au repos, les campagnes JMeter initiales et les essais complémentaires
de capacité et de workers. Révision du 21 octobre 2026.

La source modifiable est [main.tex](main.tex) ; les quatre schémas et les deux
logos vectoriels sont dans [images/](images/). Les figures, les légendes et les
renvois sont conservés dans leur mise en page d’origine.

## Régénérer le PDF

Depuis la racine du dépôt, avec Tectonic installé :

```sh
mkdir -p tmp/rapport-build
tectonic --outdir tmp/rapport-build rapport/main.tex
cp tmp/rapport-build/main.pdf rapport/intern-report.pdf
```

Les fichiers intermédiaires restent dans `tmp/`. La source et ses images suffisent
également à compiler le document dans un éditeur LaTeX.

## Résultats et suivi

- [Campagnes et preuves de mesure](../mesure/preuves/README.md).
- [Synthèse des mesures complémentaires](../mesure/docs/capacity-summary.md).
- [Comparaison avec le prototype Figma, T25](../tests/figma-comparison.md).
- [Cahier de recette](../tests/cahier_de_tests.pdf) ; T24 reste à vérifier.

Les rapports de campagne archivés et leurs empreintes sont conservés sans modification.

## Crédits des logos

Logos Polytech Marseille et Aix-Marseille Université, fournis avec le projet LaTeX
initial : logotype Polytech extrait de la charte officielle, logo amU converti
en PDF vectoriel. Leurs proportions et couleurs sont conservées.
