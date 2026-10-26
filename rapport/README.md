# Compte rendu du projet de virtualisation

Le [rapport final](intern-report.pdf) présente les déploiements VM et Docker,
les mesures au repos, les campagnes JMeter initiales et les essais complémentaires
de capacité et de workers. Révision du 25 octobre 2026 : démarche Figma,
ingénierie front et courbe p95 de montée en charge intégrées.

La source modifiable est [main.tex](main.tex) ; les quatre schémas et les deux
logos vectoriels sont dans [images/](images/). La courbe de charge vectorielle
est dans [mesure/docs/courbes/capacity-p95.pdf](../mesure/docs/courbes/capacity-p95.pdf).

## Régénérer le PDF

Depuis la racine du dépôt, avec Tectonic installé :

```sh
uv run --no-project --with matplotlib==3.10.7 python mesure/scripts/generate_capacity_chart.py
mkdir -p tmp/rapport-build
tectonic --outdir tmp/rapport-build rapport/main.tex
cp tmp/rapport-build/main.pdf rapport/intern-report.pdf
```

Les fichiers intermédiaires restent dans `tmp/`. Le PDF de la courbe est livré :
sa régénération est facultative pour une simple recompilation. Conserver
l’arborescence du dépôt pour résoudre les images et la courbe depuis `main.tex`.

## Résultats et suivi

- [Campagnes et preuves de mesure](../mesure/preuves/README.md).
- [Conception Figma, ingénierie front et traces des prompts](../docs/Figma.md).
- [Synthèse des mesures complémentaires](../mesure/docs/capacity-summary.md).
- [Comparaison avec le prototype Figma, T25](../tests/figma-comparison.md).
- [Cahier de recette](../tests/cahier_de_tests.pdf).

Les rapports de campagne archivés et leurs empreintes sont conservés sans modification.

## Crédits des logos

Logos Polytech Marseille et Aix-Marseille Université, fournis avec le projet LaTeX
initial : logotype Polytech extrait de la charte officielle, logo amU converti
en PDF vectoriel. Leurs proportions et couleurs sont conservées.
